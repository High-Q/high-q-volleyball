## MODIFIED Requirements

### Requirement: members テーブル

システムは `members` テーブルを以下の列で定義 MUST する: `id` (UUID PK、auth.users.id と同一値で 1:1 紐付け)、`email` (text UNIQUE NOT NULL、auth.users.email から同期)、`last_name` (text NOT NULL CHECK length >= 1)、`first_name` (text NOT NULL CHECK length >= 1)、`display_name` (text NOT NULL — `last_name || ' ' || first_name` をトリガで自動同期)、`nickname` (text NULL — 会員サイト上での自己呼称、任意)、`birthday` (date NOT NULL)、`phone` (text NULL)、`experience_level` (text CHECK in `'beginner'`,`'intermediate'`,`'experienced'`、default `'beginner'`)、`role` (text CHECK in `'member'`,`'admin'`、default `'member'`)、`profile` (jsonb default `{}`)、`admin_note` (text NULL — 運営側メモ、admin のみ閲覧・編集)、`created_at` / `updated_at` (timestamptz default now)。

`last_name` / `first_name` はそれぞれ 1 文字以上の必須属性で、片方欠落での INSERT / UPDATE は SHALL NOT 許容される。`display_name` は派生属性として残り、`last_name || ' ' || first_name`（半角スペース 1 個区切り）を BEFORE INSERT/UPDATE トリガ `sync_members_display_name()` が同期する SHALL。アプリ層から `display_name` を直接 UPDATE する経路は本 change 後に存在 SHALL NOT し、RLS の UPDATE 列ホワイトリストからも除外される（書き込みは `last_name` / `first_name` 経由のみ）。

本 change 適用後、新規会員の作成経路は **Edge Function `verify-signup` 経由のみ** となる SHALL。トリガー `on_auth_user_created` は引き続き存在するが、本フローでは Function 内で同一トランザクションで正式値に UPSERT 上書きされるため、placeholder 行が観測されることは SHALL NOT 起きる。Phase 1 で作成済みの既存会員行は、本 change のデータ移行で `last_name` / `first_name` が分離格納され、`display_name` はトリガ再計算により同一文字列を維持する MUST。

`admin_note` 列は別 change で追加済み。NULL 許容、DB レベルの CHECK 制約は付与 MUST NOT する（長さ制限はアプリ層で 500 文字）。新規会員作成時は NULL のまま作成され、admin が `/members` 画面の詳細 sheet 経由で UPDATE するときのみ値が入る。本人（非 admin）からの UPDATE は RLS WITH CHECK 句で拒否される（`rls-policies` capability に従う）。

`profile` jsonb 列は系統的に複数の運用キーを保持する SHALL。本 change 適用後の認知済キーは:

- `signup_completed` (boolean) — signup フロー完了マーカー（既存）
- `terms_agreed_at` (ISO 8601 string) — 利用規約同意時刻（既存）
- `name_split_needed` (boolean, optional) — 移行時の姓・名分離不能フラグ（既存）
- `correction_requests` (array, optional) — admin による未対応の修正依頼一覧（**本 change で追加**）。各要素は `{ field, message, requested_at, requested_by }` 形式 SHALL。空配列 / キー未定義は「未対応依頼なし」と等価に扱う MUST。詳細スキーマは `member-correction-requests` capability を参照

`correction_requests` の書き込み主体は admin および会員サイトの各 `updateMyXxx` mutation（自動消化用の削除のみ）SHALL であり、それ以外のアプリ経路から本キーへの書き込みを行う SHALL NOT。

#### Scenario: 新規会員行の作成経路
- **WHEN** 本 change 適用後に `auth.users` への INSERT が発生する
- **THEN** その経路は Edge Function `verify-signup` 内の admin API 呼び出しのみであり、`signup_pending` の payload で `members` 行も即座に正式値（`last_name` / `first_name` を含む）で埋まる

#### Scenario: trigger による display_name 同期
- **WHEN** 任意の `members` 行に対し `UPDATE members SET last_name = '田中', first_name = '美咲'` を実行
- **THEN** トリガ `sync_members_display_name()` により同行の `display_name` が `'田中 美咲'` に自動更新される

#### Scenario: 姓欠落の INSERT は拒否される
- **WHEN** `INSERT INTO members (id, email, last_name, first_name, birthday) VALUES (..., '', '美咲', ...)` を実行
- **THEN** CHECK 制約違反でエラーとなり、行は作成されない

#### Scenario: 名欠落の INSERT は拒否される
- **WHEN** `INSERT INTO members (id, email, last_name, first_name, birthday) VALUES (..., '田中', '', ...)` を実行
- **THEN** CHECK 制約違反でエラーとなり、行は作成されない

#### Scenario: 既存会員行の移行後の整合性
- **WHEN** 本 change のデータ移行完了後に Phase 1 から存在する任意の会員行を SELECT
- **THEN** `last_name` / `first_name` がそれぞれ 1 文字以上の値を持ち、`display_name = last_name || ' ' || first_name` の関係が成立する

#### Scenario: 分離不能行のフラグ立て
- **WHEN** 移行時に `display_name` を半角スペースで分割できない既存行（スペース無し / 連続スペースのみ等）が存在する
- **THEN** 当該行は `last_name = display_name` / `first_name = '(未設定)'` / `profile.name_split_needed = true` の状態で残され、運営が SELECT で抽出できる

#### Scenario: トリガ by-product の placeholder 行は観測されない
- **WHEN** 本 change 適用後の任意のタイミングで `members` を SELECT する
- **THEN** `display_name = ''` または `birthday = current_date` の placeholder 状態の行は存在しない

#### Scenario: admin の placeholder 創出（既存運用）
- **WHEN** Supabase Dashboard 経由で admin ユーザーを auth.users に手動追加する（運用作業）
- **THEN** その admin ユーザーは Edge Function を経由しないため `members` 行はトリガーで placeholder として作成され、運用手順に従って `last_name` / `first_name` / `role = 'admin'` / `profile.signup_completed = true` を手動セットする

#### Scenario: admin_note 列のデフォルト
- **WHEN** 任意の経路で新規 members 行が作成される
- **THEN** `admin_note` は NULL で作成される（明示的に値を指定する経路は存在しない）

#### Scenario: admin による admin_note の更新
- **WHEN** admin が `UPDATE members SET admin_note = '左利き / 体験申込' WHERE id = :id` を発行
- **THEN** 1 行更新される（admin の UPDATE 権限は RLS で全件 / 全列許容）

#### Scenario: admin_note の空文字 / NULL 復元
- **WHEN** admin が `UPDATE members SET admin_note = NULL WHERE id = :id` を発行
- **THEN** 1 行更新され、`admin_note IS NULL` 状態に戻る

#### Scenario: correction_requests キーの初期状態
- **WHEN** signup フロー（`verify-signup`）で新規作成された会員行を SELECT
- **THEN** `profile.correction_requests` キーは未定義であり、アプリ層は空配列扱いする

#### Scenario: correction_requests のキー追加
- **WHEN** admin が会員に修正依頼を作成する
- **THEN** 該当会員の `profile.correction_requests` 配列にエントリが 1 件 push される（既存配列があれば append、未定義なら新規配列として作成）

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
- `correction_request_count` (integer) — 当該 member の `profile.correction_requests` 配列の要素数。キー未定義 / 空配列のときは 0 を返す

view は members × reservations × events の LEFT JOIN ベースで構成し、`reservations.status = 'attended'` で絞った集計サブクエリを join する形を取る。`correction_request_count` は `jsonb_array_length(coalesce(profile->'correction_requests', '[]'::jsonb))` で算出 SHALL する。view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM member_list_view LIMIT 1` を実行
- **THEN** 上記の全列（`correction_request_count` を含む）が返る

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

#### Scenario: correction_request_count = 0 のとき
- **WHEN** `profile.correction_requests` キーが未定義の会員の `member_list_view` 行を取得
- **THEN** `correction_request_count = 0` が返る

#### Scenario: correction_request_count = N のとき
- **WHEN** `profile.correction_requests` 配列が 3 要素ある会員の `member_list_view` 行を取得
- **THEN** `correction_request_count = 3` が返る
