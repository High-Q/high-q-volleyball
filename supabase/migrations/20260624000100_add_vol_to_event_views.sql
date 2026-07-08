-- =============================================================================
-- event_list_view / event_detail_view に vol 列を追加 (event-vol-numbering / #158)
-- =============================================================================
-- 目的:
--   admin 一覧 / 詳細および会員サイトの取得経路が単一クエリで回号 (events.vol) を
--   取得できるよう、両 view に vol 列を追加する。
--
-- ⚠️ create or replace view 制約 (42P16):
--   既存列の前への挿入・列順変更は不可。vol は両 view の **末尾** に追加する。
--   その他の列・集計ロジック・security_invoker は不変 (列追加のみ)。
--
-- 関連:
--   openspec/changes/event-vol-numbering/specs/data-schema/spec.md
--   supabase/migrations/20260619120000_event_list_view_v2_headcount.sql (list v2)
--   supabase/migrations/20260502172040_event_detail_view_v3_member_breakdown.sql (detail v3)
--
-- ROLLBACK: vol 列を除いた直前定義へ差し戻すには、上記 2 migration の
--   create or replace view を再 RUN する (列削除も列順変更扱いになる場合は先に
--   drop view してから再 RUN する)。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- event_list_view: vol を末尾に追加 (v2 の集計式・列順は不変)
-- -----------------------------------------------------------------------------
create or replace view public.event_list_view
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
  coalesce(r.reserved_count, 0)::int              as reserved_count,
  e.created_at,
  e.updated_at,
  -- 末尾追加 (42P16 制約): 回号
  e.vol                                           as vol
from public.events e
left join public.venues v on v.id = e.venue_id
left join lateral (
  select sum(1 + guest_count) as reserved_count
  from public.reservations
  where event_id = e.id
    and status in ('reserved', 'attended')
) r on true;

-- -----------------------------------------------------------------------------
-- event_detail_view: vol を末尾に追加 (v3 の集計式・列順は不変)
-- -----------------------------------------------------------------------------
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
  e.updated_at,
  coalesce(agg.reserved_member_count, 0)::int     as reserved_member_count,
  coalesce(agg.checked_in_member_count, 0)::int   as checked_in_member_count,
  -- 末尾追加 (42P16 制約): 回号
  e.vol                                           as vol
from public.events e
left join public.venues v on v.id = e.venue_id
left join lateral (
  select
    sum(1 + r.guest_count) filter (where r.status in ('reserved', 'attended')) as reserved_count,
    sum(1 + r.guest_count) filter (where r.status = 'attended')                as checked_in_count,
    sum(1 + r.guest_count) filter (where r.status = 'waitlist')                as waitlist_count,
    count(*) filter (where r.status in ('reserved', 'attended'))               as reserved_member_count,
    count(*) filter (where r.status = 'attended')                              as checked_in_member_count,
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
    ) as first_time_count
  from public.reservations r
  where r.event_id = e.id
) agg on true;
