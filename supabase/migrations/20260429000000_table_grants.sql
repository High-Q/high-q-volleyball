-- =============================================================================
-- High Q テーブル権限付与 (Issue #147 補正)
-- =============================================================================
-- 目的: 20260428143738_db_schema_foundation.sql 適用後、anon ロールから venues
--       SELECT が "permission denied" になる問題を解消する。
--
-- 経緯:
--   - PostgreSQL は GRANT (テーブル権限) と RLS (行フィルタ) の二段構え
--   - RLS ポリシーが許可していても、GRANT がないとテーブルアクセス自体ができない
--   - Supabase の `ALTER DEFAULT PRIVILEGES` は、設定ロール本人が CREATE した
--     テーブルにのみ既定権限を付与するため、SQL Editor (supabase_admin 相当)
--     から CREATE したテーブルには伝搬しないケースがある
--   - 既存 events/members/reservations が anon SELECT 可能なのは、Supabase
--     プロジェクト初期化時に dashboard 経由で作られた可能性、または
--     supabase_auth_admin 等の特定ロール経由で created_at された結果と推測
--
-- 本 migration では既存テーブル含めて明示的に GRANT を発行し、運用を安定化する。
--
-- RLS 設計 (再掲):
--   - venues: 誰でも SELECT 可、admin のみ INSERT/UPDATE/DELETE
--   - identity_documents: 自分のみ SELECT/INSERT/DELETE、admin は全件 + UPDATE
--   - events: 誰でも SELECT 可、admin のみ INSERT/UPDATE/DELETE
--   - members: 自分のみ SELECT/UPDATE、admin は全件
--   - reservations: 自分のみ SELECT/INSERT/UPDATE、admin は全件 DELETE 可
--
-- 関連: openspec/changes/db-schema-foundation/specs/rls-policies/spec.md
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. anon (未認証) ロール
-- -----------------------------------------------------------------------------
-- 公開情報のみアクセス許可。RLS で更にフィルタされる。

grant usage on schema public to anon;

-- 公開テーブル: venues / events は誰でも閲覧可
grant select on public.venues to anon;
grant select on public.events to anon;


-- -----------------------------------------------------------------------------
-- 2. authenticated (ログイン済み) ロール
-- -----------------------------------------------------------------------------
-- 全 5 テーブルにアクセス可。書き込み制限は RLS で実施。

grant usage on schema public to authenticated;

-- venues: SELECT 全員、書き込みは RLS で admin のみ
grant select, insert, update, delete on public.venues to authenticated;

-- events: SELECT 全員、書き込みは RLS で admin のみ
grant select, insert, update, delete on public.events to authenticated;

-- members: 自分の行のみ SELECT/UPDATE、admin は全件
grant select, update, delete on public.members to authenticated;

-- reservations: 自分の予約 SELECT/INSERT/UPDATE、admin は全件
grant select, insert, update, delete on public.reservations to authenticated;

-- identity_documents: 自分の書類 SELECT/INSERT/UPDATE/DELETE、admin は全件
grant select, insert, update, delete on public.identity_documents to authenticated;


-- -----------------------------------------------------------------------------
-- 3. 将来の新規テーブルへの既定権限
-- -----------------------------------------------------------------------------
-- 以降、postgres ロール (SQL Editor / supabase_admin) で作成される public 配下の
-- テーブルが anon / authenticated に自動で SELECT 可能になるよう既定を更新。

alter default privileges in schema public
  grant select on tables to anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;


-- -----------------------------------------------------------------------------
-- 4. 検証
-- -----------------------------------------------------------------------------
-- 適用後、verify_rls.sql を再 RUN して以下を確認:
--   ✅ 5.1 anon で venues 5 行取得
--   ✅ 5.2 member (authenticated) で venues INSERT は RLS で拒否
--
-- has_table_privilege() で権限を直接確認することも可能:
--   select
--     has_table_privilege('anon', 'public.venues', 'SELECT') as anon_select_venues,
--     has_table_privilege('authenticated', 'public.venues', 'SELECT') as auth_select_venues,
--     has_table_privilege('authenticated', 'public.venues', 'INSERT') as auth_insert_venues;
--   → 全て true で、INSERT は RLS で実際は拒否される (権限はあるが行レベルで弾かれる)

-- =============================================================================
-- ロールバック (緊急時のみ)
-- =============================================================================
-- alter default privileges in schema public revoke select, insert, update, delete on tables from authenticated;
-- alter default privileges in schema public revoke select on tables from anon;
-- revoke all on public.identity_documents from authenticated;
-- revoke all on public.reservations from authenticated;
-- revoke all on public.members from authenticated;
-- revoke all on public.events from authenticated;
-- revoke all on public.venues from authenticated;
-- revoke select on public.events from anon;
-- revoke select on public.venues from anon;
