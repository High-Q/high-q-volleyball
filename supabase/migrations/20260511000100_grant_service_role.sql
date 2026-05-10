-- =============================================================================
-- service_role に public schema の必要テーブル GRANT を付与
-- =============================================================================
-- 関連: openspec/changes/reservation-signup-zero-stale/
--
-- 経緯:
--   - Edge Function `request-signup` から `members` SELECT が
--     `permission denied for table members` で失敗（service_role 経由でも）
--   - 原因: Supabase 既存 migration では anon / authenticated への GRANT は
--     行われているが、service_role には明示 GRANT が無く、テーブルによっては
--     アクセス権が無い状態になっていた
--   - 対処: signup フローで Edge Function が触るテーブル（members /
--     signup_pending）+ 将来の admin 系 Function 用に events / reservations /
--     identity_documents / venues も含めて service_role に明示 GRANT
--
-- service_role は Supabase の Edge Function / Admin API 用の特権ロール。
-- ブラウザに公開されることは無く、RLS bypass で全行アクセス可能。
-- =============================================================================


grant usage on schema public to service_role;

grant select, insert, update, delete on public.events             to service_role;
grant select, insert, update, delete on public.members            to service_role;
grant select, insert, update, delete on public.reservations       to service_role;
grant select, insert, update, delete on public.venues             to service_role;
grant select, insert, update, delete on public.identity_documents to service_role;
grant select, insert, update, delete on public.signup_pending     to service_role;


-- 将来の新規テーブルは自動で service_role が CRUD できるよう既定権限を更新。
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;


-- 検証:
--   set role service_role;
--   select count(*) from public.members;
--   reset role;
