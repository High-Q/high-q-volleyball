## ADDED Requirements

### Requirement: event_detail_view の権限契約

システムは MUST `event_detail_view` に対して以下の権限を設定する:

- `revoke all on public.event_detail_view from anon`（未認証ユーザーは SELECT 不可。admin アプリ専用ビューであることを契約として明示）
- `grant select on public.event_detail_view to authenticated`（認証済ユーザーは SELECT 可。実際の行レベル制御は参照テーブルの RLS を継承）

view 自体は `SECURITY INVOKER` で作成されるため、参照テーブル（events / venues / reservations）の RLS が呼び出し元の権限で評価される。`reservations` の SELECT RLS（`auth.uid() = member_id OR is_admin()`）により、admin で SELECT すると `reserved_count` / `checked_in_count` / `first_time_count` / `waitlist_count` が全 reservations を母集団とした正しい値で返り、非 admin で SELECT すると自分の予約のみを母集団とした不完全な値が返る。

本 view は MUST admin アプリ（`/events/:id`）でのみ呼ばれる契約とする SHALL。非 admin に呼ばれた場合の挙動は「集計値が部分的に過小になる」という形で安全側に倒れる（情報漏洩はない）。

#### Scenario: 未認証ユーザーは SELECT 不可
- **WHEN** anon ロールで `SELECT * FROM event_detail_view` を実行
- **THEN** permission denied エラーが返る

#### Scenario: admin が SELECT
- **WHEN** `is_admin()` が true のユーザーが `SELECT * FROM event_detail_view WHERE id = '<uuid>'` を実行
- **THEN** 1 行返り、reserved_count / checked_in_count / first_time_count / waitlist_count はすべて全 reservations を母集団とした正しい集計値となる

#### Scenario: 一般会員が SELECT した場合の安全性
- **WHEN** `role = 'member'` のユーザーが `SELECT * FROM event_detail_view WHERE id = '<uuid>'` を実行
- **THEN** 行は返るが、reservations の RLS により集計対象が「自分の予約のみ」に縮退する。他の member の予約情報は一切漏洩しない（reserved_count 等が過小評価されるだけ）

### Requirement: event_participants_view の権限契約

システムは MUST `event_participants_view` に対して以下の権限を設定する:

- `revoke all on public.event_participants_view from anon`
- `grant select on public.event_participants_view to authenticated`

view は `SECURITY INVOKER` で作成され、参照テーブル（reservations / members / events）の RLS が呼び出し元の権限で評価される。`reservations` の SELECT RLS と `members` の SELECT RLS（`id = auth.uid() OR is_admin()`）の AND により、admin で SELECT すると全 member の参加者行が返り、非 admin で SELECT すると自分の予約 × 自分の member 行のみが返る（つまり「自分が予約しているイベントの自分の行のみ」）。

本 view も MUST admin アプリ（`/events/:id`）でのみ呼ばれる契約とする SHALL。非 admin が呼んでも他人の参加者情報（display_name / email / experience_level）は一切漏れない。

#### Scenario: 未認証ユーザーは SELECT 不可
- **WHEN** anon ロールで `SELECT * FROM event_participants_view` を実行
- **THEN** permission denied エラーが返る

#### Scenario: admin が SELECT
- **WHEN** `is_admin()` が true のユーザーが `SELECT * FROM event_participants_view WHERE event_id = '<uuid>'` を実行
- **THEN** 当該 event の全参加者行（status NOT IN ('cancelled')）が返り、display_name / email / experience_level / is_first_time すべてが含まれる

#### Scenario: 一般会員が SELECT した場合の安全性
- **WHEN** `role = 'member'` のユーザーが `SELECT * FROM event_participants_view WHERE event_id = '<uuid>'` を実行
- **THEN** 自分が当該 event に予約していれば自分の 1 行のみが返る。他の member の display_name / email / experience_level は一切漏洩しない

### Requirement: 既存 reservations RLS の流用契約

本 change では `reservations` テーブルの RLS ポリシーを **変更しない**。既存ポリシーで MUST 以下が保証されている:

- SELECT: 自分の予約のみ可、admin は全件可
- UPDATE: member は自分の予約の `'reserved' → 'cancelled'` のみ可、admin は全件・全 status へ可
- DELETE: admin のみ可

これにより、本画面の **個別チェックイン**（status を `'reserved' ⇄ 'attended'` に UPDATE）と **個別キャンセル代行**（status を `'cancelled'` に UPDATE）は admin の既存 UPDATE 権限の範囲内で動作 SHALL。新規ポリシー追加は不要。

#### Scenario: admin によるチェックイン UPDATE
- **WHEN** admin が `UPDATE reservations SET status = 'attended', checked_in_at = now() WHERE id = '<uuid>' AND status = 'reserved'` を実行
- **THEN** 既存 RLS により 1 行更新される（admin は全件・全 status 操作可）

#### Scenario: admin によるキャンセル代行 UPDATE
- **WHEN** admin が `UPDATE reservations SET status = 'cancelled' WHERE id = '<uuid>'` を実行
- **THEN** 既存 RLS により 1 行更新され、トリガー `set_reservations_cancelled_at` が `cancelled_at = now()` を自動設定する

#### Scenario: 非 admin による他人の予約 UPDATE
- **WHEN** `role = 'member'` のユーザーが他人の reservation_id を指定して同じ UPDATE を実行
- **THEN** 既存 RLS により 0 行更新（拒否）。本画面は admin guard 配下のため通常はここに到達しないが、API 直叩きでも安全
