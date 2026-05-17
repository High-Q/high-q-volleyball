-- =============================================================================
-- #253: reservations.event_id FK を ON DELETE RESTRICT → ON DELETE CASCADE に変更
-- =============================================================================
-- 背景:
--   admin のイベント削除で、UI 上「予約 0 件」のイベントでも、過去にキャンセルされた
--   reservations 行 (status='cancelled' / 'no_show') が DB に残っていると ON DELETE
--   RESTRICT で削除がブロックされる不整合があった。さらに、運用上は有効予約が
--   あっても主催者の判断で event を削除できる必要がある (雨天中止等)。
--   AlertDialog 二段階確認 + 予約内訳の事前表示で誤操作を防ぐ前提で、DB レベルの
--   RESTRICT 防御を解除し CASCADE に切り替える。
--
-- 仕様:
--   openspec/changes/fix-admin-event-delete-cancelled-reservations/specs/data-schema/spec.md
-- =============================================================================

alter table public.reservations
  drop constraint if exists reservations_event_id_fkey;

alter table public.reservations
  add constraint reservations_event_id_fkey
  foreign key (event_id)
  references public.events(id)
  on delete cascade;

-- =============================================================================
-- ロールバック SQL (#269 の rollback SQL 運用先行例)
-- =============================================================================
-- 本 migration を取り消す場合は以下を手動で実行:
--
--   alter table public.reservations
--     drop constraint if exists reservations_event_id_fkey;
--
--   alter table public.reservations
--     add constraint reservations_event_id_fkey
--     foreign key (event_id)
--     references public.events(id)
--     on delete restrict;
--
-- 注意:
--   - rollback は events を削除した際に reservations が orphan として残らない時点で
--     のみ実施可能 (CASCADE 期間中に削除された reservations は復元できない)
--   - アプリ側 (useEventDelete / EventDeleteDialog) も同時に revert すること
-- =============================================================================
