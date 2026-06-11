-- =============================================================================
-- admin_dashboard_view + admin_dashboard_recent_bookings_view (Issue #149)
-- =============================================================================
-- 目的: admin の `/` (Dashboard) 画面が概況数値・最近の予約を単一クエリで
--       取得するための view を 2 本追加する。
--
-- 関連:
--   openspec/changes/admin-dashboard-screen/specs/data-schema/spec.md
--   openspec/changes/admin-dashboard-screen/design.md (D1, D4)
--
-- 設計上のポイント:
--   - SECURITY INVOKER で呼び出し元 (admin) の RLS を継承
--   - JST 月境界は AT TIME ZONE 'Asia/Tokyo' を明示し、セッション timezone に依存しない
--   - 平均充足率は capacity NULL のイベントを母数から除外
--   - 0 除算回避は分母 = 0 のときに CASE で NULL を返す
--   - admin 専用契約のため anon は明示 REVOKE、authenticated / service_role に SELECT GRANT
--
-- ROLLBACK 手順 (緊急時):
--   revoke all on public.admin_dashboard_view from service_role;
--   revoke all on public.admin_dashboard_view from authenticated;
--   drop view if exists public.admin_dashboard_view;
--   revoke all on public.admin_dashboard_recent_bookings_view from service_role;
--   revoke all on public.admin_dashboard_recent_bookings_view from authenticated;
--   drop view if exists public.admin_dashboard_recent_bookings_view;
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. admin_dashboard_view
-- -----------------------------------------------------------------------------

create or replace view public.admin_dashboard_view
with (security_invoker = true)
as
with
  bounds as (
    select
      (date_trunc('month', now() at time zone 'Asia/Tokyo'))                       at time zone 'Asia/Tokyo' as this_month_start,
      (date_trunc('month', now() at time zone 'Asia/Tokyo') + interval '1 month')  at time zone 'Asia/Tokyo' as next_month_start,
      (date_trunc('month', now() at time zone 'Asia/Tokyo') - interval '1 month')  at time zone 'Asia/Tokyo' as last_month_start,
      (now() - interval '6 months')                                                                         as six_months_ago
  ),
  upcoming as (
    select
      count(*) filter (
        where e.start_at > now()
          and e.status != 'cancelled'
          and e.visibility = 'published'
      )::int as cnt,
      count(*) filter (
        where e.start_at > now()
          and e.status != 'cancelled'
          and e.visibility = 'published'
          and e.capacity is not null
          and coalesce(elv.reserved_count, 0) >= e.capacity
      )::int as full_cnt
    from public.events e
    left join public.event_list_view elv on elv.id = e.id
  ),
  attended_this_month as (
    select
      coalesce(sum(1 + r.guest_count), 0)::int                                       as cnt,
      coalesce(sum(coalesce(e.fee, v.default_fee, 0) * (1 + r.guest_count)), 0)::int as fee_total
    from public.reservations r
    join public.events e on e.id = r.event_id
    left join public.venues v on v.id = e.venue_id
    cross join bounds b
    where r.status = 'attended'
      and e.start_at >= b.this_month_start
      and e.start_at <  b.next_month_start
  ),
  attended_last_month as (
    select
      coalesce(sum(1 + r.guest_count), 0)::int                                       as cnt,
      coalesce(sum(coalesce(e.fee, v.default_fee, 0) * (1 + r.guest_count)), 0)::int as fee_total
    from public.reservations r
    join public.events e on e.id = r.event_id
    left join public.venues v on v.id = e.venue_id
    cross join bounds b
    where r.status = 'attended'
      and e.start_at >= b.last_month_start
      and e.start_at <  b.this_month_start
  ),
  fill_rate_6m as (
    select avg(elv.reserved_count::numeric / e.capacity) as avg_rate
    from public.events e
    join public.event_list_view elv on elv.id = e.id
    cross join bounds b
    where e.end_at   < now()
      and e.start_at >= b.six_months_ago
      and e.capacity is not null
      and e.capacity > 0
  )
select
  u.cnt          as upcoming_event_count,
  u.full_cnt     as upcoming_full_event_count,
  atm.cnt        as attended_this_month_count,
  alm.cnt        as attended_last_month_count,
  case when alm.cnt = 0 then null
       else (atm.cnt - alm.cnt)::numeric / alm.cnt
  end            as attended_delta_pct_vs_last_month,
  atm.fee_total  as fee_total_this_month,
  alm.fee_total  as fee_total_last_month,
  case when alm.fee_total = 0 then null
       else (atm.fee_total - alm.fee_total)::numeric / alm.fee_total
  end            as fee_delta_pct_vs_last_month,
  fr.avg_rate    as avg_fill_rate_6m
from upcoming u
cross join attended_this_month atm
cross join attended_last_month alm
cross join fill_rate_6m fr;

comment on view public.admin_dashboard_view is
  '#149 Dashboard 概況集計。常に 1 行を返す。JST 月境界 / 6 ヶ月充足率。';


-- -----------------------------------------------------------------------------
-- 2. admin_dashboard_recent_bookings_view
-- -----------------------------------------------------------------------------

create or replace view public.admin_dashboard_recent_bookings_view
with (security_invoker = true)
as
select
  r.id                                                            as reservation_id,
  r.member_id,
  coalesce(
    nullif(
      btrim(coalesce(m.last_name, '') || ' ' || coalesce(m.first_name, '')),
      ''
    ),
    m.nickname
  )                                                               as member_display_name,
  coalesce(
    left(m.last_name, 1),
    left(m.nickname, 1)
  )                                                               as member_initial,
  r.event_id,
  e.name                                                          as event_name,
  r.created_at,
  r.status
from public.reservations r
join public.members m on m.id = r.member_id
join public.events e  on e.id = r.event_id
where r.member_id is not null
  and r.status   != 'cancelled';

comment on view public.admin_dashboard_recent_bookings_view is
  '#149 Dashboard 最近の予約。匿名化済み (member_id NULL) と cancelled を view 側で除外。';


-- -----------------------------------------------------------------------------
-- 3. 権限 (admin 専用契約)
-- -----------------------------------------------------------------------------
-- anon は明示 REVOKE (admin 専用 view であることを契約として明示)。
-- authenticated は SELECT 可。RLS は参照テーブル側 (events / reservations /
-- members / venues / event_list_view) で評価される。
-- service_role は SELECT 可 (Edge Function / Admin API 用の保険、template 規約)。

revoke all   on public.admin_dashboard_view                from anon;
grant select on public.admin_dashboard_view                to authenticated;
grant select on public.admin_dashboard_view                to service_role;

revoke all   on public.admin_dashboard_recent_bookings_view from anon;
grant select on public.admin_dashboard_recent_bookings_view to authenticated;
grant select on public.admin_dashboard_recent_bookings_view to service_role;
