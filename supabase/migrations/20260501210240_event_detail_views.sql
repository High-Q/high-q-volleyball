-- =============================================================================
-- event_detail_view + event_participants_view (Issue #87)
-- =============================================================================
-- 目的:
--   admin の /events/:id 画面が単一クエリでヘッダ集計と参加者一覧を取得するための
--   2 本の DTO ビューを追加する。
--
--   - event_detail_view:
--       events × venues LEFT JOIN + reservations の集計サブクエリ 4 種
--       (reserved_count / checked_in_count / first_time_count / waitlist_count)
--       fee は COALESCE(events.fee, venues.default_fee)
--
--   - event_participants_view:
--       reservations × members × events INNER JOIN
--       + is_first_time の NOT EXISTS 計算 (当該 member が当該 event.start_at より前に
--         他イベントで status='attended' を持たない場合 true)
--       status='cancelled' は除外 (active な予約のみ表示)
--
-- 関連:
--   openspec/changes/admin-event-detail-screen/specs/data-schema/spec.md
--   openspec/changes/admin-event-detail-screen/specs/rls-policies/spec.md
--   openspec/changes/admin-event-detail-screen/design.md (D1, D2)
--
-- 設計上のポイント:
--   - SECURITY INVOKER: 呼び出し元の権限で評価し、参照テーブルの RLS を継承
--   - 本 view 群は admin アプリ (/events/:id) でのみ呼ばれる契約
--     非 admin が呼んだ場合は reservations RLS により集計値が部分的に過小になるが
--     情報漏洩はない (SELECT 行が member 自身の予約に縮退するだけ)
--   - is_first_time は NOT EXISTS でクライアント N+1 を回避
--   - cancelled は participants_view から除外 (admin 画面の active 一覧専用)
--
-- ロールバック:
--   drop view if exists public.event_participants_view;
--   drop view if exists public.event_detail_view;
-- =============================================================================


-- -----------------------------------------------------------------------------
-- event_detail_view
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
  e.updated_at
from public.events e
left join public.venues v on v.id = e.venue_id
left join lateral (
  select
    count(*) filter (where r.status = 'reserved')                       as reserved_count,
    count(*) filter (where r.status = 'attended')                       as checked_in_count,
    count(*) filter (
      where r.status = 'reserved'
        and not exists (
          select 1
          from public.reservations r2
          join public.events e2 on e2.id = r2.event_id
          where r2.member_id = r.member_id
            and r2.status = 'attended'
            and r2.event_id <> e.id
            and e2.start_at < e.start_at
        )
    )                                                                   as first_time_count,
    count(*) filter (where r.status = 'waitlist')                       as waitlist_count
  from public.reservations r
  where r.event_id = e.id
) agg on true;


-- -----------------------------------------------------------------------------
-- event_participants_view
-- -----------------------------------------------------------------------------
create or replace view public.event_participants_view
with (security_invoker = true)
as
select
  r.id                                            as reservation_id,
  r.event_id,
  r.member_id,
  m.display_name,
  m.email,
  m.experience_level,
  r.guest_count,
  r.status,
  r.checked_in_at,
  r.created_at,
  not exists (
    select 1
    from public.reservations r2
    join public.events e2 on e2.id = r2.event_id
    where r2.member_id = r.member_id
      and r2.status = 'attended'
      and r2.event_id <> r.event_id
      and e2.start_at < e.start_at
  )                                               as is_first_time
from public.reservations r
join public.members m on m.id = r.member_id
join public.events e on e.id = r.event_id
where r.status in ('reserved', 'attended', 'no_show', 'waitlist');


-- -----------------------------------------------------------------------------
-- 権限付与
-- -----------------------------------------------------------------------------
-- anon ロールには SELECT を与えない (admin アプリ専用ビューであることを契約として明示)。
-- authenticated ロールには SELECT を許可。実際の行レベル制御は参照テーブル
-- (events / venues / reservations / members) の RLS で行われる。
-- 本 view 群は admin アプリ (/events/:id) でのみ呼ばれる契約 — 非 admin が呼んでも
-- 情報漏洩はないが、集計値が部分的に過小になる動作を許容する。
-- -----------------------------------------------------------------------------

revoke all on public.event_detail_view from anon;
grant select on public.event_detail_view to authenticated;

revoke all on public.event_participants_view from anon;
grant select on public.event_participants_view to authenticated;


-- =============================================================================
-- ロールバック (緊急時のみ)
-- =============================================================================
-- drop view if exists public.event_participants_view;
-- drop view if exists public.event_detail_view;
