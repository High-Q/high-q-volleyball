## MODIFIED Requirements

### Requirement: members テーブル

システムは `members` テーブルを以下の列で定義 MUST する: `id` (UUID PK、auth.users.id と同一値で 1:1 紐付け)、`email` (text UNIQUE NOT NULL、auth.users.email から同期)、`display_name` (text NOT NULL)、`nickname` (text NULL — 会員サイト上での自己呼称、任意)、`birthday` (date NOT NULL)、`phone` (text NULL)、`experience_level` (text CHECK in `'beginner'`,`'intermediate'`,`'experienced'`、default `'beginner'`)、`role` (text CHECK in `'member'`,`'admin'`、default `'member'`)、`profile` (jsonb default `{}`)、`admin_note` (text NULL — 運営側メモ、admin のみ閲覧・編集)、`created_at` / `updated_at` (timestamptz default now)。

本 change 適用後、新規会員の作成経路は **Edge Function `verify-signup` 経由のみ** となる SHALL。トリガー `on_auth_user_created` は引き続き存在するが、本フローでは Function 内で同一トランザクションで正式値に UPSERT 上書きされるため、placeholder 行が観測されることは SHALL NOT 起きる。Phase 1 で作成済みの既存会員行は変更されず互換性を保つ MUST。

`admin_note` 列は本 change で追加 MUST する。NULL 許容、DB レベルの CHECK 制約は付与 MUST NOT する（長さ制限はアプリ層で 500 文字）。新規会員作成時は NULL のまま作成され、admin が `/members` 画面の詳細 sheet 経由で UPDATE するときのみ値が入る。本人（非 admin）からの UPDATE は RLS WITH CHECK 句で拒否される（`rls-policies` capability に従う）。

#### Scenario: 新規会員行の作成経路
- **WHEN** 本 change 適用後に `auth.users` への INSERT が発生する
- **THEN** その経路は Edge Function `verify-signup` 内の admin API 呼び出しのみであり、`signup_pending` の payload で `members` 行も即座に正式値で埋まる

#### Scenario: トリガー by-product の placeholder 行は観測されない
- **WHEN** 本 change 適用後の任意のタイミングで `members` を SELECT する
- **THEN** `display_name = ''` または `birthday = current_date` の placeholder 状態の行は存在しない

#### Scenario: admin の placeholder 創出（既存運用）
- **WHEN** Supabase Dashboard 経由で admin ユーザーを auth.users に手動追加する（運用作業）
- **THEN** その admin ユーザーは Edge Function を経由しないため `members` 行はトリガーで placeholder として作成され、運用手順に従って `role = 'admin'` + `profile.signup_completed = true` を手動セットする（既存運用と同等）

#### Scenario: admin_note 列のデフォルト
- **WHEN** 任意の経路で新規 members 行が作成される
- **THEN** `admin_note` は NULL で作成される（明示的に値を指定する経路は存在しない）

#### Scenario: admin による admin_note の更新
- **WHEN** admin が `UPDATE members SET admin_note = '左利き / 体験申込' WHERE id = :id` を発行
- **THEN** 1 行更新される（admin の UPDATE 権限は RLS で全件 / 全列許容）

#### Scenario: admin_note の空文字 / NULL 復元
- **WHEN** admin が `UPDATE members SET admin_note = NULL WHERE id = :id` を発行
- **THEN** 1 行更新され、`admin_note IS NULL` 状態に戻る

## ADDED Requirements

### Requirement: member_list_view ビュー

システムは MUST `member_list_view` という SQL view を提供する。本 view は admin の `/members` 画面が単一クエリで会員一覧と集計情報を取得するための DTO として機能し、以下の列を返す:

- `id` (uuid) — members.id
- `display_name` (text) — members.display_name
- `email` (text) — members.email
- `experience_level` (text) — members.experience_level（'beginner' / 'intermediate' / 'experienced'）
- `admin_note` (text) — members.admin_note（NULL 可）
- `first_attended_at` (timestamptz) — 当該 member が `status = 'attended'` を持つ events のうち最も古い `events.start_at`。attended 履歴ゼロのときは NULL
- `attended_count` (integer) — 当該 member の `reservations.status = 'attended'` の件数（同伴は含まない、member 単位）
- `last_attended_at` (timestamptz) — 当該 member が `status = 'attended'` を持つ events のうち最も新しい `events.start_at`。attended 履歴ゼロのときは NULL
- `created_at` (timestamptz) — members.created_at（参考列、ソート対象外）

view は members × reservations × events の LEFT JOIN ベースで構成し、`reservations.status = 'attended'` で絞った集計サブクエリを join する形を取る。view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM member_list_view LIMIT 1` を実行
- **THEN** 上記の全列が返る

#### Scenario: attended 履歴ありの会員
- **WHEN** ある member が events 3 件で `status = 'attended'`、1 件で `status = 'reserved'`、1 件で `status = 'cancelled'` を持つ
- **THEN** `attended_count = 3`、`first_attended_at` / `last_attended_at` は 3 件の attended events のうち最古 / 最新の start_at を返す

#### Scenario: attended 履歴ゼロの会員
- **WHEN** ある member が `status = 'reserved'` のみ持つ（attended 履歴ゼロ）
- **THEN** `attended_count = 0`、`first_attended_at IS NULL`、`last_attended_at IS NULL`

#### Scenario: 予約一切なしの会員
- **WHEN** ある member が reservations を 1 件も持たない（登録のみ）
- **THEN** `attended_count = 0`、`first_attended_at IS NULL`、`last_attended_at IS NULL` の行が返る（LEFT JOIN により会員行は欠落しない）

#### Scenario: 同伴は累計に含まれない
- **WHEN** ある member が `status = 'attended'` で `guest_count = 2` の予約を 3 件持つ
- **THEN** `attended_count = 3`（member 数ベース、同伴 2 名は加算されない）

#### Scenario: 非 admin の SELECT
- **WHEN** 非 admin ユーザーが `SELECT * FROM member_list_view` を実行
- **THEN** `members` テーブルの SELECT RLS により自分の行のみ返る（admin_note 列含む。本人の閲覧経路はアプリ層列指定で除外、`rls-policies` capability に従う）

### Requirement: member_history_view ビュー

システムは MUST `member_history_view` という SQL view を提供する。本 view は admin の `/members` 画面の詳細 sheet が単一クエリで会員の参加履歴を取得するための DTO として機能し、以下の列を返す:

- `reservation_id` (uuid) — reservations.id
- `member_id` (uuid) — reservations.member_id
- `event_id` (uuid) — reservations.event_id
- `event_name` (text) — events.name
- `start_at` (timestamptz) — events.start_at
- `venue_name` (text) — venues.name（events.venue_id 経由）
- `status` (text) — reservations.status
- `guest_count` (smallint) — reservations.guest_count
- `checked_in_at` (timestamptz) — reservations.checked_in_at（NULL = 未チェックイン）
- `is_first_time` (boolean) — 当該 member が当該 event.start_at より前に他イベントで `status = 'attended'` を持たない場合に true

view は reservations × events × venues の INNER JOIN を持つ。`status = 'cancelled'` の行は本 view に含めない MUST（admin の詳細 sheet 参加履歴は active な予約のみを表示するため）。`status IN ('reserved', 'attended', 'no_show', 'waitlist')` の行のみ返す SHALL。

`is_first_time` の判定は `event_participants_view` と同一ロジック（`NOT EXISTS` サブクエリで「過去 attended ゼロ」を判定）を採用 MUST。

view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM member_history_view WHERE member_id = '<uuid>'` を実行
- **THEN** 上記の全列を含む参加履歴行が返る

#### Scenario: cancelled 除外
- **WHEN** ある member の reservations に reserved 3 件 + cancelled 2 件 + attended 1 件が存在する
- **THEN** 当該 member_id でフィルタした view から返るのは 4 行（reserved 3 + attended 1）。cancelled 2 件は除外される

#### Scenario: 時系列降順での取得
- **WHEN** admin が `SELECT * FROM member_history_view WHERE member_id = :id ORDER BY start_at DESC` を実行
- **THEN** start_at の新しい順で並ぶ

#### Scenario: is_first_time の判定
- **WHEN** ある member の最も古い attended 行を SELECT
- **THEN** 当該行の `is_first_time = true`（過去 attended ゼロ）

#### Scenario: 参加履歴ゼロ
- **WHEN** ある member に `status IN ('reserved', 'attended', 'no_show', 'waitlist')` の予約が 0 件
- **THEN** 当該 member_id でフィルタした view は 0 行返る

### Requirement: 新規 view の更新可否

システムは MUST `member_list_view` および `member_history_view` を **読み取り専用** として運用する。両 view への INSERT / UPDATE / DELETE は SHALL 発行しない（PostgreSQL の view 仕様により集計列を含む view は更新不可。アプリ側コードはベーステーブル `members` / `reservations` / `events` / `venues` 経由で書き込む）。

#### Scenario: 集計 view の更新不可
- **WHEN** admin が `INSERT INTO member_list_view ...` を実行
- **THEN** PostgreSQL から「cannot insert into view」相当のエラーが返る（集計列を含む view の標準動作）

### Requirement: Branded Types との対応（member_list_view / member_history_view）

システムは TypeScript 側で `member_list_view` の行型を `MemberListRow`、`member_history_view` の行型を `MemberHistoryRow` という型エイリアスで提供 SHALL する。両型の `id` / `member_id` / `event_id` / `reservation_id` 列は既存 Branded Types（`MemberId` / `EventId` / `ReservationId`）と整合 MUST する。

#### Scenario: MemberListRow の型整合
- **WHEN** `MemberListRow['id']` を参照
- **THEN** `MemberId` 型として型付けされる

#### Scenario: MemberHistoryRow の型整合
- **WHEN** `MemberHistoryRow['member_id']` / `MemberHistoryRow['event_id']` / `MemberHistoryRow['reservation_id']` を参照
- **THEN** それぞれ `MemberId` / `EventId` / `ReservationId` として型付けされる
