## MODIFIED Requirements

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
- `has_identity_document` (boolean) — 当該 member が `identity_documents` 行を 1 件以上持つ場合に `true`、0 件のとき `false`。`status` の値は問わない（pending / approved / rejected いずれかが 1 件でもあれば `true`）

view は members × reservations × events の LEFT JOIN ベースで構成し、`reservations.status = 'attended'` で絞った集計サブクエリを join する形を取る。`correction_request_count` は `jsonb_array_length(coalesce(profile->'correction_requests', '[]'::jsonb))` で算出 SHALL する。`has_identity_document` は `EXISTS (SELECT 1 FROM identity_documents WHERE member_id = members.id)` の boolean 副問合せで算出 SHALL する。view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM member_list_view LIMIT 1` を実行
- **THEN** 上記の全列（`correction_request_count` / `has_identity_document` を含む）が返る

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

#### Scenario: has_identity_document = false（書類未提出会員）
- **WHEN** ある member の `identity_documents` 行が 0 件の状態で `member_list_view` 行を取得
- **THEN** `has_identity_document = false` が返る

#### Scenario: has_identity_document = true（status = 'pending'）
- **WHEN** ある member の `identity_documents` 行が `status = 'pending'` で 1 件存在する状態で `member_list_view` 行を取得
- **THEN** `has_identity_document = true` が返る

#### Scenario: has_identity_document = true（status = 'approved'）
- **WHEN** ある member の `identity_documents` 行が `status = 'approved'` で 1 件存在する状態で `member_list_view` 行を取得
- **THEN** `has_identity_document = true` が返る

#### Scenario: has_identity_document = true（status = 'rejected' のみ）
- **WHEN** ある member の `identity_documents` 行が `status = 'rejected'` で 1 件のみ存在する状態で `member_list_view` 行を取得
- **THEN** `has_identity_document = true` が返る（status の値は問わず、行が存在すれば true）

### Requirement: Branded Types との対応（member_list_view / member_history_view）

システムは TypeScript 側で `member_list_view` の行型を `MemberListRow`、`member_history_view` の行型を `MemberHistoryRow` という型エイリアスで提供 SHALL する。両型の `id` / `member_id` / `event_id` / `reservation_id` 列は既存 Branded Types（`MemberId` / `EventId` / `ReservationId`）と整合 MUST する。

`MemberListRow` 型は `has_identity_document: boolean` プロパティを MUST 含む SHALL。

#### Scenario: MemberListRow の型整合
- **WHEN** `MemberListRow['id']` を参照
- **THEN** `MemberId` 型として型付けされる

#### Scenario: MemberHistoryRow の型整合
- **WHEN** `MemberHistoryRow['member_id']` / `MemberHistoryRow['event_id']` / `MemberHistoryRow['reservation_id']` を参照
- **THEN** それぞれ `MemberId` / `EventId` / `ReservationId` として型付けされる

#### Scenario: MemberListRow に has_identity_document が含まれる
- **WHEN** `MemberListRow['has_identity_document']` を参照
- **THEN** `boolean` 型として型付けされる
