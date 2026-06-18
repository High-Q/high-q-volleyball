-- =============================================================================
-- event_list_view reserved_count 集計検証 (#346)
-- =============================================================================
-- 目的:
--   event_list_view.reserved_count が event_detail_view.reserved_count と
--   完全同値 (本人 + 同伴の人数 / reserved + attended 母集団) であることを
--   smoke 確認する。両者は同一集計ロジックを共有する契約 (data-schema spec)。
--
-- 実行:
--   supabase db query --linked --file supabase/tests/verify_event_list_view.sql
--
-- 確認観点:
--   1. 一覧 view と詳細 view の reserved_count が全イベントで一致 (mismatch=0)
--   2. 権限が anon=false / authenticated=true
-- =============================================================================

-- 1. 一覧 × 詳細の reserved_count 同値性 (mismatch は 0 であること)
select
  'event_list_view vs event_detail_view reserved_count' as check_name,
  count(*)                                              as total_events,
  count(*) filter (where l.reserved_count = d.reserved_count) as matching,
  count(*) filter (where l.reserved_count <> d.reserved_count) as mismatching,
  0                                                    as expected_mismatching
from public.event_list_view l
join public.event_detail_view d on d.id = l.id;

-- 2. 権限マトリクス (anon=false / authenticated=true)
select
  'event_list_view'                                                         as table_name,
  has_table_privilege('anon',          'public.event_list_view', 'SELECT')  as anon_select,
  has_table_privilege('authenticated', 'public.event_list_view', 'SELECT')  as authenticated_select;
-- 期待: anon=false / authenticated=true
