## 1. DB マイグレーション（FK 変更）

- [x] 1.1 forward migration `supabase/migrations/<timestamp>_change_reservations_event_fk_to_cascade.sql` を作成
  - 既存 FK 名を `information_schema.table_constraints` で確認してから `ALTER TABLE reservations DROP CONSTRAINT ...`
  - `ALTER TABLE reservations ADD CONSTRAINT reservations_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE`
- [x] 1.2 rollback SQL を併設（CASCADE → RESTRICT に戻す DDL）。`#269` の rollback SQL 運用先行例として扱う
- [x] 1.3 ローカル dev Supabase に `pnpm db:push` で適用済（出力 "Finished supabase db push"）。pg_constraint での直接確認はローカル Docker 未起動のため Task 2 の SQL テストで担保する

## 2. FK 連鎖削除の DB レベル確認（TDD 相当）

- [x] 2.1 `supabase/tests/verify_reservations_event_fk_cascade.sql` を作成:
  - reservations.event_id FK が ON DELETE CASCADE であることを information_schema で検証
  - reservations.member_id FK が ON DELETE SET NULL のままであることを回帰確認
  - event + reserved + cancelled + no_show 3 件を seed → event DELETE → reservations 0 件を実データで確認

## 3. entities 層: classify クエリ追加（TDD）

- [x] 3.1 `apps/admin/src/entities/event/api/eventQueries.spec.ts` に `classifyEventReservations(eventId)` テストを追加（3 ケース: 集計 / 0 件 / RLS エラー）
- [x] 3.2 `eventQueries.ts` に `classifyEventReservations` を実装（reservations 全件 SELECT → クライアント側で status 集計）
- [x] 3.3 Public API (`apps/admin/src/entities/event/index.ts`) からエクスポート

## 4. entities 層: deleteEvent のエラー分類簡素化（TDD）

- [x] 4.1 `eventQueries.spec.ts` の `deleteEvent` テストを更新: FK 違反テスト削除 + CASCADE 前提の成功ケース追加
- [x] 4.2 `FetchErrorCode` から `RESERVATIONS_EXIST` を削除、`classifyError` の 23503 マッピングを撤去（後段 features/event-delete でも参照削除予定）
- [x] 4.3 30 テスト緑化 (`pnpm --filter @high-q/admin exec vitest run src/entities/event/api/eventQueries.spec.ts`)

## 5. features 層: useEventDelete の更新（TDD）

- [x] 5.1 `useEventDelete.spec.ts` 全面書き換え: open() で classify 呼出 / breakdown 取得失敗時 canConfirm=false / 件数なし・あり 2 種類の Toast 文言 / RESERVATIONS_EXIST テスト削除
- [x] 5.2 `useEventDelete.ts` を更新: `breakdown` / `isLoadingBreakdown` / `breakdownError` / `canConfirm` (ComputedRef) を expose、`activeCount` / `historyCount` / `totalCount` helpers を export
- [x] 5.3 `ERROR_MESSAGES` から `RESERVATIONS_EXIST` を削除
- [x] 5.4 11 テスト緑化 (`pnpm --filter @high-q/admin exec vitest run src/features/event-delete/composables/useEventDelete.spec.ts`)

## 6. UI 層: AlertDialog 更新

- [x] 6.1 `EventDeleteDialog.spec.ts` 全 10 ケース更新済（Loading / Empty / cancelled-only / active あり / breakdown error / delete success / delete cancel / delete error）
- [x] 6.2 `EventDeleteDialog.vue` を全面更新: breakdown / breakdownError / canConfirm 購読、4 状態を data-testid 付きで描画
- [x] 6.3 `aria-live="polite"` を内訳セクションに付与、削除ボタンに `aria-disabled` + `disabled` 二重設定
- [x] 6.4 既存 Tailwind preset で 1 カラム積み + space-y で対応済
- [x] 6.5 21 テスト緑 + 全 admin 762 テスト緑 + typecheck + build pass

## 7. E2E（admin）

- [x] 7.1 既存 `e2e/admin/events-crud.e2e.ts` の冒頭コメントにある方針「削除フローは component test で網羅済・E2E は auth guard のみ」に従い、本変更でも E2E 追加は行わない。21 件の vitest (useEventDelete / EventDeleteDialog) で Loading / Empty / cancelled-only / active あり / error の全状態を網羅
- [x] 7.2 同上方針により edge case の Playwright 追加もスキップ。FK CASCADE の DB レベル検証は `supabase/tests/verify_reservations_event_fk_cascade.sql` で担保

## 8. ドキュメント反映 / 仕上げ

- [x] 8.1 `docs/05-インターフェース/01-UI設計方針.md` への追記は不要と判断（既存 AlertDialog 例の枠内に収まる変更）
- [x] 8.2 `docs/` / `openspec/specs/`（canonical）の `RESERVATIONS_EXIST` 言及は `/opsx:sync` で本変更の spec を反映する際に解消される。`apps/admin/src/entities/event/api/eventQueries.ts` の deleteEvent コメントは本 Apply で更新済
- [x] 8.3 Open Questions: キャンセル通知メールは #272 を起票済、削除監査ログは #267 (Sentry) または独立扱いの方針を design.md に明記済
- [x] 8.4 admin 762 テスト全 green
- [x] 8.5 admin build pass
- [ ] 8.6 PR Preview で実機確認: 有効予約あり削除 / 予約 0 件削除 / 内訳取得失敗（dev tools で網路遮断）の 3 シナリオを翔太郎くんが踏み、OK を確認
