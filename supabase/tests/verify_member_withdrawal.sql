-- =============================================================================
-- 会員退会フロー DB 整合性検証 (Issue #254 / #255 — Section 1)
-- =============================================================================
-- 目的:
--   20260516000000_member_withdrawal_flow.sql 適用後に Supabase SQL Editor で
--   RUN し、スキーマ変更が意図通りであることを検証する。
--
-- 検証範囲:
--   1.1 reservations.member_id が NULL 許容
--   1.2 reservations.member_id FK が ON DELETE SET NULL
--   1.3 member_history_view が member_id IS NOT NULL を含む定義
--   1.4 event_participants_view が members LEFT JOIN + COALESCE 表示
--   1.5 reservations INSERT RLS WITH CHECK が member_id IS NOT NULL を強制
--
-- 実データ操作 (member 削除 → reservation 残存 / identity_documents 連鎖削除 /
-- phone_at_booking / note の NULL 化) は Edge Function 統合テスト
-- (Section 2.4 / 2.6) で担保するため、本ファイルでは情報スキーマ確認のみ行う。
--
-- 関連: openspec/changes/member-withdrawal-flow/specs/data-schema/spec.md
-- =============================================================================


-- =============================================================================
-- Test 1.1: reservations.member_id が NULL 許容
-- =============================================================================
select
  case
    when is_nullable = 'YES' then '✅ 1.1 PASS: reservations.member_id is nullable'
    else format('❌ 1.1 FAIL: is_nullable = %s (期待 YES)', is_nullable)
  end as result
from information_schema.columns
where table_schema = 'public'
  and table_name = 'reservations'
  and column_name = 'member_id';


-- =============================================================================
-- Test 1.2: reservations.member_id FK が ON DELETE SET NULL
-- =============================================================================
select
  case
    when rc.delete_rule = 'SET NULL'
      then '✅ 1.2 PASS: reservations.member_id FK is ON DELETE SET NULL'
    else format('❌ 1.2 FAIL: delete_rule = %s (期待 SET NULL)', rc.delete_rule)
  end as result
from information_schema.referential_constraints rc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = rc.constraint_name
 and kcu.constraint_schema = rc.constraint_schema
where rc.constraint_schema = 'public'
  and kcu.table_name = 'reservations'
  and kcu.column_name = 'member_id';


-- =============================================================================
-- Test 1.3: member_history_view 定義に member_id IS NOT NULL を含む
-- =============================================================================
select
  case
    when pg_get_viewdef('public.member_history_view'::regclass) ilike '%member_id is not null%'
      then '✅ 1.3 PASS: member_history_view filters member_id IS NOT NULL'
    else '❌ 1.3 FAIL: member_history_view 定義に member_id IS NOT NULL がない'
  end as result;


-- =============================================================================
-- Test 1.4: event_participants_view が members LEFT JOIN + COALESCE 表示
-- =============================================================================
select
  case
    when pg_get_viewdef('public.event_participants_view'::regclass) ilike '%left join%members%'
      and pg_get_viewdef('public.event_participants_view'::regclass) ilike '%coalesce(m.display_name%'
      then '✅ 1.4 PASS: event_participants_view uses LEFT JOIN members + COALESCE'
    else '❌ 1.4 FAIL: event_participants_view 定義が LEFT JOIN / COALESCE を含まない'
  end as result;


-- =============================================================================
-- Test 1.5: reservations INSERT RLS WITH CHECK が member_id IS NOT NULL を強制
-- =============================================================================
select
  case
    when pg_get_expr(pol.polwithcheck, pol.polrelid) ilike '%member_id is not null%'
      then '✅ 1.5 PASS: reservations_insert_self policy enforces member_id IS NOT NULL'
    else '❌ 1.5 FAIL: reservations_insert_self policy に member_id IS NOT NULL がない'
  end as result
from pg_policy pol
join pg_class cls on cls.oid = pol.polrelid
where cls.relname = 'reservations'
  and pol.polname = 'reservations_insert_self';


-- =============================================================================
-- 一括サマリー (上記 5 テストを 1 行に集約して RUN するためのオプション)
-- =============================================================================
-- 上記の個別 SELECT を 1 回ずつ RUN すれば PASS / FAIL が確認できる。
-- 全 PASS であれば Section 1 (Task 1.1〜1.5) の完了条件を満たす。
