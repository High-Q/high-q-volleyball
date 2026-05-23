-- =============================================================================
-- #296 member_list_view に correction_request_count 列を追加
-- =============================================================================
-- 目的:
--   admin の会員一覧 (`/members`) で「修正依頼 N」バッジを 1 クエリで表示するため、
--   member_list_view に correction_request_count 列を追加する。
--   `profile->'correction_requests'` 配列の長さを返す（キー未定義 / 空配列 → 0）。
--
-- 仕様:
--   openspec/changes/member-correction-requests/specs/data-schema/spec.md
--     (Requirement: member_list_view ビュー)
--   openspec/changes/member-correction-requests/design.md (決定 6)
--
-- ロールバック手順 (緊急時):
--   元の view 定義 (20260515133901_add_members_admin_note_and_views.sql の Section 2) を
--   再適用する。アプリ側コードが新列を参照していない限り drop + recreate で安全。
-- =============================================================================

create or replace view public.member_list_view
with (security_invoker = true)
as
select
  m.id,
  m.display_name,
  m.email,
  m.experience_level,
  m.admin_note,
  m.created_at,
  agg.first_attended_at,
  coalesce(agg.attended_count, 0)::int as attended_count,
  agg.last_attended_at,
  -- #296: profile.correction_requests 配列の要素数。
  --       jsonb_array_length は引数が null / non-array でエラーするため、
  --       coalesce で空配列にフォールバック。
  jsonb_array_length(coalesce(m.profile -> 'correction_requests', '[]'::jsonb))::int
    as correction_request_count
from public.members m
left join lateral (
  select
    min(e.start_at) filter (where r.status = 'attended') as first_attended_at,
    max(e.start_at) filter (where r.status = 'attended') as last_attended_at,
    count(*)         filter (where r.status = 'attended') as attended_count
  from public.reservations r
  join public.events e on e.id = r.event_id
  where r.member_id = m.id
) agg on true;

comment on view public.member_list_view is
  '#150/#296 admin /members 画面用 DTO。members + reservations × events 集計 (attended ベース) + correction_request_count (修正依頼件数)。';

-- GRANT: 既存と同じ。authenticated に SELECT 付与 (RLS で members 行レベル制御)
revoke all on public.member_list_view from anon;
grant select on public.member_list_view to authenticated;


-- =============================================================================
-- 検証 (適用後に手動実行を推奨):
-- =============================================================================
-- 1. 列の存在確認
--   select column_name from information_schema.columns
--     where table_schema = 'public' and table_name = 'member_list_view'
--     order by ordinal_position;
--   -- 期待: 既存 9 列 + correction_request_count
--
-- 2. correction_request_count = 0 のケース
--   select correction_request_count from public.member_list_view
--     where (select profile->'correction_requests' from public.members m where m.id = member_list_view.id) is null
--     limit 1;
--   -- 期待: 0
-- =============================================================================
