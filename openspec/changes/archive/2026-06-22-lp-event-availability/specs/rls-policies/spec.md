## MODIFIED Requirements

### Requirement: event_availability_view の RLS と権限

`event_availability_view` ビューは `SECURITY DEFINER` で作成 MUST する。関数所有者（postgres ロール）の権限で `reservations` を全件集計し、当該イベントの予約埋まり具合の集計のみを返す。本ビューは個人情報を含まない集計のみを返すため、未認証ユーザー（anon）を含む全ロールに SELECT を許可する。

権限設定:

- `grant select on public.event_availability_view to anon` — 未認証ユーザー（LP 来訪者）も集計を SELECT 可
- `grant select on public.event_availability_view to authenticated` — 認証済ユーザーは SELECT 可

view が返す列は集計 (`event_id`, `capacity`, `reserved_count`) のみで、個別予約行・予約者 ID 等の個人情報を含まない MUST。これにより `SECURITY DEFINER` でも個人情報漏洩リスクを構造的に排除する。anon への公開は本「個人情報を含まない集計のみ」という不変条件に依存する MUST であり、本ビューに個人情報に当たる列を追加してはならない MUST NOT。

`reservations` テーブルの既存 SELECT RLS（`auth.uid() = member_id OR is_admin()`）は本変更で **改変 SHALL NOT**。会員ロールからの直接 SELECT は引き続き自分の予約のみが返る。全件集計を得る経路は `event_availability_view` のみに集約する MUST。

#### Scenario: anon は event_availability_view から集計を SELECT できる
- **WHEN** anon JWT で `SELECT event_id, capacity, reserved_count FROM event_availability_view`
- **THEN** 各イベントの集計（定員・予約数）が返り、個別予約行・予約者 ID は含まれない

#### Scenario: 会員ロールでの SELECT が全件集計を返す
- **WHEN** AAL2 の `role = 'member'` ユーザーが `SELECT event_id, reserved_count FROM event_availability_view`
- **THEN** 当該会員以外の予約も含めた全件集計が返る（view が `SECURITY DEFINER` であるため）

#### Scenario: admin ロールでの SELECT も全件集計を返す
- **WHEN** AAL2 の `is_admin() = true` ユーザーが `SELECT event_id, reserved_count FROM event_availability_view`
- **THEN** 全件集計が返る（admin で呼んでも会員で呼んでも同じ結果）

#### Scenario: reservations の直接 SELECT 経路は会員自身分のみ
- **WHEN** 会員ロールで `SELECT * FROM reservations`
- **THEN** 自分の予約のみが返る（既存 RLS 維持。anon への view 公開によって直接アクセス経路は緩和されていない）

### Requirement: event_availability_view の呼び出し契約

`event_availability_view` は `apps/reservation`・`apps/admin`・`apps/lp` から呼び出される MUST 契約とする。`apps/lp` は未認証（anon）の来訪者に対し当該イベントの残席表現（募集中の残席数・満員）を出すために本 view を SELECT してよい。anon に公開してよいのは個人情報を含まない集計（`event_id`, `capacity`, `reserved_count`）に限る MUST であり、待ち人数・予約者 ID・ニックネーム等を anon に返してはならない MUST NOT。

#### Scenario: LP からの呼び出しは集計のみ
- **WHEN** `apps/lp` 配下のソースで `event_availability_view` を SELECT する
- **THEN** 取得列は `event_id`, `capacity`, `reserved_count` の集計のみであり、個人情報列を含まない
