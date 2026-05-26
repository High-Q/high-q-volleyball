-- =============================================================================
-- event_availability_view (Issue #277)
-- =============================================================================
-- 目的:
--   会員サイト (apps/reservation) のイベント一覧 / 詳細で「予約埋まり具合」
--   (本人 + 同伴の人数ベース集計) を表示するための DTO ビュー。
--
-- 設計上のポイント:
--   - SECURITY DEFINER: 関数所有者の権限で reservations を全件集計する。
--     reservations の SELECT RLS は会員に対して「自分の予約のみ」を返すため、
--     SECURITY INVOKER だと会員には不完全な集計しか見えない。
--     SECURITY DEFINER で全件集計を返しつつ、view が返す列は
--     集計値 (event_id, capacity, reserved_count) のみで、
--     個人情報 (member_id / 個別予約行) は構造的に一切含まない。
--   - admin 用 event_list_view / event_detail_view とは独立に運用。
--     admin 側 view (SECURITY INVOKER) はそのままで、本変更で改変しない。
--   - 集計ロジックは event_detail_view v3 と同一: 「人数 = sum(1 + guest_count)
--     FILTER (status IN ('reserved', 'attended'))」。チェックインで人数は減らない。
--     cancelled は除外。
--   - events 全行に LEFT JOIN LATERAL で予約 0 件イベントも 0 行で返す。
--
-- 関連:
--   openspec/changes/reservation-event-availability/specs/data-schema/spec.md
--   openspec/changes/reservation-event-availability/specs/rls-policies/spec.md
--   openspec/changes/reservation-event-availability/design.md (D1)
--
-- ロールバック: DROP VIEW IF EXISTS public.event_availability_view;
-- =============================================================================

create or replace view public.event_availability_view
with (security_invoker = false)
as
select
  e.id                                              as event_id,
  e.capacity,
  coalesce(agg.reserved_count, 0)::int              as reserved_count
from public.events e
left join lateral (
  select
    sum(1 + r.guest_count) filter (where r.status in ('reserved', 'attended')) as reserved_count
  from public.reservations r
  where r.event_id = e.id
) agg on true;


-- -----------------------------------------------------------------------------
-- 権限付与
-- -----------------------------------------------------------------------------
-- anon ロールには SELECT を与えない (認証済ユーザー専用ビュー)。
-- authenticated ロールには SELECT を許可。SECURITY DEFINER により
-- 関数所有者 (postgres) の権限で reservations を全件集計するが、
-- 返す列は集計のみ (event_id / capacity / reserved_count) で個人情報は含まない。
-- -----------------------------------------------------------------------------

revoke all on public.event_availability_view from anon;
grant select on public.event_availability_view to authenticated;


-- =============================================================================
-- ロールバック (緊急時のみ)
-- =============================================================================
-- drop view if exists public.event_availability_view;
