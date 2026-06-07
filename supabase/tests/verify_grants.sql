-- =============================================================================
-- GRANT 検証クエリ — public schema 全テーブル x 3 ロール x 4 権限
-- =============================================================================
-- 目的:
--   Supabase Data API 仕様変更 (2026-10-30 既存プロジェクト enforce, Issue #247)
--   に備え、public schema の全ベーステーブルに対し anon / authenticated /
--   service_role の SELECT / INSERT / UPDATE / DELETE 権限が
--   想定どおり付与されているかを一覧化する。
--
-- 実行方法:
--   supabase db query --linked --file supabase/tests/verify_grants.sql
--
--   ※ `supabase link` 先で dev / prd を切り替えること。
--   ※ 出力を Markdown / CSV で保存したい場合は --output json などを併用。
--
-- 期待値の読み方:
--   - service_role は 4 権限すべて true が期待値 (Edge Function 用、必須)
--   - authenticated は 4 権限 true が基本。読み取り専用テーブルでは INSERT/UPDATE/DELETE が false でも可
--   - anon は SELECT のみ true が期待値 (公開テーブル)。会員専用テーブルは全 false
--
-- 出力の活用:
--   - 新規テーブル追加直後: 当該テーブル行が想定どおりかを目視
--   - enforce 期日 (2026-10-30) 前点検: 全テーブルが service_role SELECT=true か確認
--   - 補正 migration: false 行を抽出して `grant ... to <role>` を追加
-- =============================================================================

with
  tables as (
    select tablename
    from pg_tables
    where schemaname = 'public'
  ),
  roles as (
    select unnest(array['anon', 'authenticated', 'service_role']::text[]) as role_name
  ),
  privileges as (
    select unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']::text[]) as privilege
  ),
  matrix as (
    select
      t.tablename,
      r.role_name,
      p.privilege
    from tables t
    cross join roles r
    cross join privileges p
  )
select
  m.tablename                                                                   as table_name,
  m.role_name                                                                   as role,
  m.privilege                                                                   as privilege,
  has_table_privilege(m.role_name, format('public.%I', m.tablename), m.privilege) as granted
from matrix m
order by
  m.tablename asc,
  case m.role_name
    when 'anon'          then 1
    when 'authenticated' then 2
    when 'service_role'  then 3
  end,
  case m.privilege
    when 'SELECT' then 1
    when 'INSERT' then 2
    when 'UPDATE' then 3
    when 'DELETE' then 4
  end;
