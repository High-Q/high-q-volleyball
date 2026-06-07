-- =============================================================================
-- #293 member_list_view に has_identity_document 列を追加
-- =============================================================================
-- 目的:
--   admin の会員一覧 (`/members`) で「書類未提出」バッジを 1 クエリで表示するため、
--   member_list_view に has_identity_document 列を追加する。
--   identity_documents 行が 1 件以上存在すれば true、0 件なら false を返す。
--   status (pending / approved / rejected) は問わない (reservation 側の
--   `hasIdentityDocument` 判定との対称性を保つため)。
--
-- 仕様:
--   openspec/changes/admin-members-incomplete-signup-badge/specs/data-schema/spec.md
--     (Requirement: member_list_view ビュー)
--   openspec/changes/admin-members-incomplete-signup-badge/design.md
--     (Decisions: `member_list_view` に列を追加する)
--
-- ROLLBACK:
--   元の view 定義
--   (20260523085011_add_correction_request_count_to_member_list_view.sql) を
--   再適用する。アプリ側コードが新列を参照していない限り、CREATE OR REPLACE で
--   安全にロールバック可能。
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
    as correction_request_count,
  -- #293: identity_documents 行の存在チェック。
  --       EXISTS は最初の 1 行で短絡評価される。status は問わない。
  exists (
    select 1
    from public.identity_documents d
    where d.member_id = m.id
  ) as has_identity_document
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
  '#150/#296/#293 admin /members 画面用 DTO。members + reservations × events 集計 (attended ベース) + correction_request_count (修正依頼件数) + has_identity_document (本人確認書類提出有無)。';

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
--   -- 期待: 既存 10 列 + has_identity_document
--
-- 2. has_identity_document = true / false のサンプル取得
--   select id, display_name, has_identity_document
--     from public.member_list_view
--     order by has_identity_document
--     limit 5;
-- =============================================================================
