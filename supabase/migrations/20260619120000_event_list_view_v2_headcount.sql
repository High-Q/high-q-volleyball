-- =============================================================================
-- event_list_view v2: reserved_count を人数ベースに統一 (Issue #346)
-- =============================================================================
-- 目的:
--   admin /events 一覧の残席表示が同伴者数 (guest_count) を数えず、かつ
--   チェックイン (status='attended') 後に数字が減る二重バグを解消する。
--   v1 (20260430120000) は `count(*) filter (status='reserved')` という
--   独自集計だったため、event_detail_view / event_availability_view が共有する
--   canonical 式 `sum(1 + guest_count) filter (status in ('reserved','attended'))`
--   と食い違っていた。本 v2 で 3 ビューの集計ロジックを完全一致させる。
--
-- v1 からの差分:
--   - LATERAL 集計サブクエリの式のみ差し替え (列名・列順・型・security_invoker
--     は不変)。型契約 (一覧 row DTO) は変わらない。
--
-- 関連:
--   openspec/changes/fix-event-list-reserved-count/specs/data-schema/spec.md
--   supabase/migrations/20260502172040_event_detail_view_v3_member_breakdown.sql
--   supabase/migrations/20260526124434_event_availability_view.sql
--
-- 設計上のポイント:
--   - SECURITY INVOKER 維持: 呼び出し元の権限で評価し参照テーブルの RLS を継承
--   - inner の sum は filter ヒット 0 件で NULL を返すが、outer の
--     coalesce(r.reserved_count, 0)::int が 0 に丸めて int へキャストする
--     (event_detail_view と同じ outer coalesce パターン)
--
-- ROLLBACK: 旧定義 (件数ベース) へ差し戻すには下記を実行する:
--   create or replace view public.event_list_view with (security_invoker = true) as
--   select e.id, e.name, e.description, e.start_at, e.end_at, e.venue_id,
--          v.name as venue_name, coalesce(e.fee, v.default_fee) as fee,
--          e.capacity, e.visibility, e.status, e.cancel_deadline,
--          coalesce(r.reserved_count, 0)::int as reserved_count,
--          e.created_at, e.updated_at
--   from public.events e
--   left join public.venues v on v.id = e.venue_id
--   left join lateral (
--     select count(*)::int as reserved_count from public.reservations
--     where event_id = e.id and status = 'reserved'
--   ) r on true;
-- =============================================================================

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
  e.updated_at
from public.events e
left join public.venues v on v.id = e.venue_id
left join lateral (
  -- 人数 (本人 + 同伴)。event_detail_view / event_availability_view と同一式。
  select sum(1 + guest_count) as reserved_count
  from public.reservations
  where event_id = e.id
    and status in ('reserved', 'attended')
) r on true;
