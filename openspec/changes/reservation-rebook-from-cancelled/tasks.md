## 1. 履歴グループ分割ロジック（TDD）

- [x] 1.1 `fetchMyReservations` の返す `MyReservationItem.event.availability`（`capacity` / `reservedCount`）が実際に populate されているか確認する。未取得なら history fetch のクエリに空き情報を含めるよう拡張する（`isFull` 判定に必須のため）
- [x] 1.2 受付可否述語 `isRebookable(item, now)` を `features/history-list/lib/` に純関数で追加（`status==='cancelled'` && `Date.parse(event.startAt) > now` && `formatAvailability(event.availability).isFull === false`）。CTA 表示可否とキャンセル済みグループ内の並び替えに使う。unit test を先に書く（cancelled×未開催×非満席 / 開催済 / 満席 / 非 cancelled の各ケース）
- [x] 1.3 `splitReservations` を `{ upcoming, cancelled, past }` の 3 グループへ拡張。`cancelled` は `status==='cancelled'` の全行、`past` はそれ以外（cancelled を除外）。`cancelled` の並びは「受付可能（`isRebookable`）を先頭に `startAt ASC` → 受付不可を `startAt DESC`」、`past`=`startAt DESC`。unit test を更新（二重掲載なし・並び順・既存 upcoming 回帰）
- [x] 1.4 `features/history-list/index.ts` の Public API を更新（`isRebookable` / 型 `SplitReservations` の cancelled 追加分をエクスポート）

## 2. 履歴画面 UI: 「再予約する」CTA

- [ ] 2.1 `HistoryRow.vue` に「再予約する」CTA を追加。`isRebookable(item, now)` が真の行のみ `@click.stop.prevent` で描画し `request-rebook` を emit（受付不可行は CTA 非表示、`data-testid="history-row-rebook"`）
- [ ] 2.2 `HistoryGroup.vue` に「キャンセル済み」グループ用の `request-rebook` pass-through を追加（行ごとの CTA 表示判定は HistoryRow 内の `isRebookable` に委ねる）
- [ ] 2.3 `HistoryPage.vue`: `groups.cancelled.length > 0` のとき「予約中」と「過去」の間に `<HistoryGroup label="キャンセル済み">` を描画。`onRequestRebook(item)` で対象イベント詳細へ `query: { book: '1' }` 付きのディープリンクで遷移（実ルート名は `apps/reservation/src/app/router.ts` を Read して確定）

## 3. イベント詳細: ディープリンク自動オープン

- [ ] 3.1 `EventDetailPage.vue`: イベントロード完了後に `route.query.book === '1'` を検知し、受付可能（`startAt > now` && 非満席）なときのみ `bookingSheetOpen = true` に設定。受付不可・loading 中は開かない
- [ ] 3.2 自動オープン直後にクエリを除去（`router.replace` で `book` を外し、ブラウザ戻りでの再オープンを防止）

## 4. 完了画面: キャンセル後の再予約導線

- [ ] 4.1 `BookingDonePage.vue` の `onConfirmCancel`: キャンセル成功時、対象イベントが受付可能（`startAt > now` && 非満席）なら events-list へ遷移せず、キャンセル後結果表示へ状態遷移（`cancelledRebookable` ref 等）。受付不可なら従来どおり `router.replace({ name: 'events-list', query: { cancelled: '1' } })`
- [ ] 4.2 結果表示に「やっぱり予約する」CTA（→ イベント詳細 `?book=1` ディープリンク）と「イベント一覧へ」退出導線を描画。デザイントークン経由・`data-testid` 付与

## 5. テスト・最終確認（まとめて 1 回）

- [ ] 5.1 component test: 履歴にキャンセル済みグループが全 cancelled を集約して描画される / 過去グループから除外される / 並び順（受付可能先頭 ASC → 受付不可 DESC）/ 受付可能行のみ「再予約する」CTA / CTA で stopPropagation + ディープリンク遷移する
- [ ] 5.2 component test: EventDetailPage が `?book=1` で受付可能時のみ Sheet 自動オープン・クエリ除去 / 受付不可時は開かない
- [ ] 5.3 component test: BookingDonePage キャンセル成功後、受付可能イベントは結果表示へ・受付不可はイベント一覧遷移
- [ ] 5.4 回帰確認: create 経路の再活性化（cancelled→reserved）成功時に `confirmed` 通知（予約完了メール再送）が発火する既存挙動が壊れていないこと
- [ ] 5.5 `pnpm exec vitest run`（reservation）/ lint / `pnpm build` が通ることを確認。マジックナンバー・FSD 境界違反がないこと
