-- =============================================================================
-- event_detail_view v2: 集計を「人数 (本人 + 同伴)」ベースに修正 (Issue #87)
-- =============================================================================
-- 目的:
--   v1 (20260501210240) では reserved_count / checked_in_count を
--   `count(*) filter (where status = 'reserved' / 'attended')` で row 単位に
--   集計していた。これには 2 つの仕様バグがあった:
--
--   1. 予約数 (reserved_count) がチェックイン操作で減る
--      - チェックイン UI で status を 'reserved' → 'attended' に変えるため、
--        reserved_count から 1 件外れて見えてしまう
--      - 期待: 予約数は active な予約の累計 (reserved + attended) であるべき
--
--   2. 同伴者 (guest_count) が一切カウントされない
--      - 1 件の reservation = 本人 1 + guest_count 名 の参加を意味するが、
--        v1 は row 数だけ数えていた
--      - 期待: 全項目を「人数 = sum(1 + guest_count)」で集計すべき
--
-- 修正後の集計仕様:
--   - reserved_count    = sum(1 + guest_count) filter (status IN ('reserved', 'attended'))
--   - checked_in_count  = sum(1 + guest_count) filter (status = 'attended')
--   - waitlist_count    = sum(1 + guest_count) filter (status = 'waitlist')
--   - first_time_count  = count(distinct member) filter (status IN ('reserved', 'attended')
--                         AND is_first_time)  ← member 単位 (同伴は member 化されてない
--                         ため初回判定の対象外)
--
-- 関連:
--   openspec/changes/admin-event-detail-screen/specs/data-schema/spec.md
--   supabase/migrations/20260501210240_event_detail_views.sql (v1)
--
-- ロールバック:
--   v1 の create or replace を再 RUN すれば戻る。
-- =============================================================================

create or replace view public.event_detail_view
with (security_invoker = true)
as
select
  e.id,
  e.name,
  e.description,
  e.start_at,
  e.end_at,
  e.venue_id,
  v.name                                          as venue_name,
  coalesce(e.fee, v.default_fee)                  as fee,
  e.capacity,
  e.visibility,
  e.status,
  e.cancel_deadline,
  coalesce(agg.reserved_count, 0)::int            as reserved_count,
  coalesce(agg.checked_in_count, 0)::int          as checked_in_count,
  coalesce(agg.first_time_count, 0)::int          as first_time_count,
  coalesce(agg.waitlist_count, 0)::int            as waitlist_count,
  e.created_at,
  e.updated_at
from public.events e
left join public.venues v on v.id = e.venue_id
left join lateral (
  select
    -- 予約数 (本人 + 同伴): active な予約 (reserved + attended) の合計人数
    -- → チェックイン操作で status が 'reserved' → 'attended' に変わっても
    --   両方とも filter にヒットするため、予約数は不変。
    sum(1 + r.guest_count) filter (
      where r.status in ('reserved', 'attended')
    ) as reserved_count,

    -- チェックイン済人数 (本人 + 同伴): attended のみ
    -- → 1 件チェックインすると同伴者数 + 1 名分カウントが上がる。
    sum(1 + r.guest_count) filter (where r.status = 'attended') as checked_in_count,

    -- 初回参加: member 数 (同伴は member 化されてないため対象外)
    -- → status IN ('reserved', 'attended') の active な予約のうち、
    --   当該 member が当該 event.start_at より前に他イベントで attended を
    --   持たないもの。
    count(*) filter (
      where r.status in ('reserved', 'attended')
        and not exists (
          select 1
          from public.reservations r2
          join public.events e2 on e2.id = r2.event_id
          where r2.member_id = r.member_id
            and r2.status = 'attended'
            and r2.event_id <> e.id
            and e2.start_at < e.start_at
        )
    ) as first_time_count,

    -- キャンセル待ち人数 (本人 + 同伴)
    sum(1 + r.guest_count) filter (where r.status = 'waitlist') as waitlist_count
  from public.reservations r
  where r.event_id = e.id
) agg on true;


-- 権限契約は v1 と同一 (revoke from anon + grant select to authenticated) のため
-- 本 migration では再付与しない。create or replace は権限を保持する。
