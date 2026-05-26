## ADDED Requirements

### Requirement: event_availability_view の RLS と権限

`event_availability_view` ビューは `SECURITY DEFINER` で作成 MUST する。関数所有者（postgres ロール）の権限で `reservations` を全件集計し、認証済ユーザー（会員 / admin 共通）に対して当該イベントの予約埋まり具合の集計のみを返す。

権限設定:

- `revoke all on public.event_availability_view from anon` — 未認証ユーザーは SELECT 不可
- `grant select on public.event_availability_view to authenticated` — 認証済ユーザーは SELECT 可

view が返す列は集計 (`event_id`, `capacity`, `reserved_count`) のみで、個別予約行・予約者 ID 等の個人情報を含まない MUST。これにより `SECURITY DEFINER` でも個人情報漏洩リスクを構造的に排除する。

`reservations` テーブルの既存 SELECT RLS（`auth.uid() = member_id OR is_admin()`）は本変更で **改変 SHALL NOT**。会員ロールからの直接 SELECT は引き続き自分の予約のみが返る。会員が全件集計を得る経路は `event_availability_view` のみに集約する MUST。

#### Scenario: anon は event_availability_view を SELECT できない
- **WHEN** anon JWT で `SELECT * FROM event_availability_view`
- **THEN** 権限エラーで拒否される

#### Scenario: 会員ロールでの SELECT が全件集計を返す
- **WHEN** AAL2 の `role = 'member'` ユーザーが `SELECT event_id, reserved_count FROM event_availability_view`
- **THEN** 当該会員以外の予約も含めた全件集計が返る（view が `SECURITY DEFINER` であるため）

#### Scenario: admin ロールでの SELECT も全件集計を返す
- **WHEN** AAL2 の `is_admin() = true` ユーザーが `SELECT event_id, reserved_count FROM event_availability_view`
- **THEN** 全件集計が返る（admin で呼んでも会員で呼んでも同じ結果）

#### Scenario: reservations の直接 SELECT 経路は会員自身分のみ
- **WHEN** 会員ロールで `SELECT * FROM reservations`
- **THEN** 自分の予約のみが返る（既存 RLS 維持。view 追加によって直接アクセス経路は緩和されていない）

### Requirement: event_availability_view の呼び出し契約

`event_availability_view` は `apps/reservation` および `apps/admin` から呼び出される MUST 契約とする。LP / anon ユーザーは本 view を呼び出してはならない MUST NOT。本契約の遵守は仕様上の責務であり、技術的には GRANT で anon を排除することで多層防御する。

#### Scenario: 呼び出し元の契約
- **WHEN** `apps/lp` 配下のソースで `event_availability_view` を SELECT する import / SQL が含まれていないか grep する
- **THEN** ヒット 0 件
