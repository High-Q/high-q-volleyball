-- =============================================================================
-- event_list_view (Issue #85)
-- =============================================================================
-- 目的: admin の /events 画面が単一クエリで一覧を取得するための DTO ビュー。
--       events × venues LEFT JOIN + reservations の status='reserved' 集計
--       (LATERAL サブクエリ) で reserved_count を返す。
--
-- 関連:
--   openspec/changes/admin-events-list-screen/specs/data-schema/spec.md
--   openspec/changes/admin-events-list-screen/specs/rls-policies/spec.md
--   openspec/changes/admin-events-list-screen/design.md (D1, §5)
--
-- 設計上のポイント:
--   - SECURITY INVOKER: 呼び出し元の権限で評価し、参照テーブルの RLS を継承する
--   - LEFT JOIN venues: venues 削除耐性 (実運用は ON DELETE RESTRICT で守られる)
--   - COALESCE(events.fee, venues.default_fee): fee NULL は会場 default_fee 継承
--   - LATERAL サブクエリ: reservations の (event_id, status) 部分インデックスが効く
--
-- ロールバック: DROP VIEW event_list_view;
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
  select count(*)::int as reserved_count
  from public.reservations
  where event_id = e.id
    and status = 'reserved'
) r on true;


-- -----------------------------------------------------------------------------
-- 権限付与
-- -----------------------------------------------------------------------------
-- anon ロールには SELECT を与えない (admin アプリ専用ビューであることを契約として明示)。
-- authenticated ロールには SELECT を許可。実際の行レベル制御は参照テーブルの RLS で行われる。
-- - events / venues は誰でも SELECT 可 (既存) → events / venues 列はすべて返る
-- - reservations は自分の予約のみ SELECT 可、admin は全件可 (既存) → reserved_count は
--   admin で呼ぶと正しい全件 COUNT、非 admin で呼ぶと自分の予約分のみ COUNT になる
--   (admin アプリでのみ呼ぶ契約: openspec/changes/admin-events-list-screen/specs/rls-policies/spec.md)
-- -----------------------------------------------------------------------------

revoke all on public.event_list_view from anon;
grant select on public.event_list_view to authenticated;


-- =============================================================================
-- ロールバック (緊急時のみ)
-- =============================================================================
-- drop view if exists public.event_list_view;
