-- =============================================================================
-- event_detail_view v3: member 数の内訳を追加 (Issue #87 - 同伴内訳表示)
-- =============================================================================
-- 目的:
--   StatCard で「予約数 7 名 (内 同伴 2 名)」「チェックイン 3 / 7 (内 同伴 1 名)」
--   のように **内訳** を表示するため、view に member 数 (= 同伴を除いた本人数
--   = row 数) を新規列として追加する。client 側で
--     reserved_count - reserved_member_count = 予約同伴数
--     checked_in_count - checked_in_member_count = チェックイン済同伴数
--   と算出する。
--
-- v2 (20260502165034) からの差分:
--   - 列追加 (末尾): reserved_member_count   (active 予約の本人数 = row 数)
--   - 列追加 (末尾): checked_in_member_count (attended の本人数 = row 数)
--
-- ⚠️ PostgreSQL の `create or replace view` 制約:
--   既存 view の列順を変更したり、既存列の前に新規列を挿入することはできない
--   (「列名を変更しようとしている」と解釈されエラー 42P16 になる)。
--   新規列は **末尾** にのみ追加可能。本 v3 では updated_at の後ろに追加する。
--
-- 関連:
--   openspec/changes/admin-event-detail-screen/specs/data-schema/spec.md
--   supabase/migrations/20260502165034_event_detail_view_v2_headcount.sql (v2)
--
-- ロールバック: v2 の create or replace を再 RUN すれば戻る (列が消えるが、
--   列削除も「列順変更」扱いで同様にエラーになる場合がある。その場合は先に
--   `drop view event_detail_view` してから v2 を RUN する)。
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
  -- 人数 (本人 + 同伴)
  coalesce(agg.reserved_count, 0)::int            as reserved_count,
  coalesce(agg.checked_in_count, 0)::int          as checked_in_count,
  coalesce(agg.first_time_count, 0)::int          as first_time_count,
  coalesce(agg.waitlist_count, 0)::int            as waitlist_count,
  -- 既存列 (v2 までと同じ列順を保つ)
  e.created_at,
  e.updated_at,
  -- 本人数 (= 同伴を除いた row 数、client で「内 同伴 = total - member」算出用)
  -- create or replace の制約により末尾にのみ追加可能 (列順変更不可)
  coalesce(agg.reserved_member_count, 0)::int     as reserved_member_count,
  coalesce(agg.checked_in_member_count, 0)::int   as checked_in_member_count
from public.events e
left join public.venues v on v.id = e.venue_id
left join lateral (
  select
    -- 人数 (本人 + 同伴)
    sum(1 + r.guest_count) filter (where r.status in ('reserved', 'attended')) as reserved_count,
    sum(1 + r.guest_count) filter (where r.status = 'attended')                as checked_in_count,
    sum(1 + r.guest_count) filter (where r.status = 'waitlist')                as waitlist_count,

    -- 本人数 (row 数)
    count(*) filter (where r.status in ('reserved', 'attended'))               as reserved_member_count,
    count(*) filter (where r.status = 'attended')                              as checked_in_member_count,

    -- 初回参加: member 数 (同伴は member 化されてないため対象外)
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
