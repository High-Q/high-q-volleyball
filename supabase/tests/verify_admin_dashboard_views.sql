-- =============================================================================
-- admin_dashboard_view / admin_dashboard_recent_bookings_view 検証 (#149)
-- =============================================================================
-- 目的:
--   両 view の構造と権限が仕様どおりかを smoke 確認する。
--   集計ロジックの数値検証は実 fixture が必要なため後段の test infra で実装する。
--
-- 実行:
--   supabase db query --linked --file supabase/tests/verify_admin_dashboard_views.sql
--
-- 確認観点:
--   1. view が存在し、admin_dashboard_view は常に 1 行返す
--   2. admin_dashboard_view の全列が期待型で返る (null 許容含む)
--   3. admin_dashboard_recent_bookings_view が cancelled / member_id NULL を返さない
--   4. 権限が anon=false / authenticated=true / service_role=true
-- =============================================================================

-- 1. 両 view が存在し、admin_dashboard_view は 1 行返す
select
  'admin_dashboard_view row count' as check_name,
  count(*)                         as actual,
  1                                as expected
from public.admin_dashboard_view;

-- 2. admin_dashboard_view 全列を表示 (型確認 + 0 除算回避の NULL を目視)
select * from public.admin_dashboard_view;

-- 3. recent_bookings には cancelled / member_id NULL が混入しない
select
  'recent_bookings has no cancelled'           as check_name,
  count(*) filter (where status = 'cancelled') as cancelled_cnt,
  0                                            as expected
from public.admin_dashboard_recent_bookings_view;

select
  'recent_bookings has no anonymized'    as check_name,
  count(*) filter (where member_id is null) as anon_cnt,
  0                                      as expected
from public.admin_dashboard_recent_bookings_view;

-- 4. 権限マトリクス
select
  table_name,
  has_table_privilege('anon',          format('public.%I', table_name), 'SELECT') as anon_select,
  has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT') as authenticated_select,
  has_table_privilege('service_role',  format('public.%I', table_name), 'SELECT') as service_role_select
from (values
  ('admin_dashboard_view'),
  ('admin_dashboard_recent_bookings_view')
) as t(table_name);
-- 期待: anon=false / authenticated=true / service_role=true (両 view とも)
