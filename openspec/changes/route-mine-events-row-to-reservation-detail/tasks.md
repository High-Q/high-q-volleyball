## 1. composable: 自分予約マップを返す拡張

- [x] 1.1 `useNextReservation.spec.ts` を更新: 戻り値に `mineByEventId` (ReadonlyMap<EventId, ReservationId>) を含むこと、`status='reserved'` かつ `startAt > now` の予約のみが Map に入ること、`cancelled` / `attended` / `no_show` / `waitlist` および過去開始の予約は除外されることを検証 (TDD: RED)
- [x] 1.2 `useNextReservation.ts` を更新: `pickNext` と同じ「reserved かつ未来」フィルタを共通関数に抽出し、最早 1 件 (`reservation`) と Map (`mineByEventId`) の両方を派生して返す (TDD: GREEN)
- [x] 1.3 既存テスト (`useNextReservation.spec.ts` の既存ケース全て) が引き続き pass することを確認

## 2. EventRow: reservationId 受け取りと遷移先分岐

- [x] 2.1 `EventRow.spec.ts` を更新: props に `reservationId` を渡したケースで router-link の `to` が `{ name: 'reservation-detail', params: { reservationId } }` になること、未指定 / null の場合は従来通り `{ name: 'event-detail', params: { id } }` になることを検証 (TDD: RED)
- [x] 2.2 `EventRow.vue` の `defineProps` に `reservationId?: ReservationId | null` を追加し、`linkTo` computed で分岐させて `<router-link :to="linkTo">` に置き換える (TDD: GREEN)
- [x] 2.3 既存 EventRow テストの routes 配列に `reservation-detail` ルートを追加し、既存ケースが pass し続けることを確認

## 3. EventRow: 「予約済」 chip 追加

- [x] 3.1 `EventRow.spec.ts` を追記: `reservationId` 渡し時のみ `[data-testid="event-row-mine-badge"]` が存在し、テキストが「予約済」を含むこと、未指定時には存在しないことを検証 (TDD: RED)
- [x] 3.2 `EventRow.vue` template に、`reservationId` truthy 時のみ描画する軽量 chip (`bg-accent-soft text-accent` 系のデザイントークン経由スタイル、`data-testid="event-row-mine-badge"`) を `AvailabilityChip` 直前または直後に追加 (TDD: GREEN)
- [x] 3.3 描画スタイルに生の hex / px / rem 直書きが入っていないことを目視確認 (HQ デザイントークンの徹底使用要件)

## 4. EventsListPage: composable Map を EventRow に配線

- [x] 4.1 `EventsListPage.spec.ts` を追記: 自分予約あり行と自分予約なし行が混在する upcoming events を mock した状態で、(a) 該当行に `event-row-mine-badge` が描画される、(b) 該当行の router-link `to` が `reservation-detail` ルートを指す、(c) 他の行は従来通り `event-detail` ルートを指す、(d) 「他のイベント」全体に NEXT のイベントが含まれない の 4 点を検証 (TDD: RED)
- [x] 4.2 `EventsListPage.vue` で `useNextReservation` から `mineByEventId` を受け取り、`EventRow` 描画時に `:reservationId="mineByEventId.get(event.id) ?? null"` を渡す (TDD: GREEN)
- [x] 4.3 既存の EventsListPage テスト全件が引き続き pass することを確認

## 5. 最終確認

- [x] 5.1 `pnpm --filter @high-q/reservation exec vitest run` を実行し全 pass を確認 (81 files / 718 tests pass)
- [x] 5.2 `pnpm --filter @high-q/reservation build` を実行し型エラー / ビルドエラーがないことを確認 (`build` + `typecheck` 両方 pass)
- [x] 5.3 マジックナンバー grep で本変更の新規導入分 0 件を確認 (既存 `text-[10px]` 1 件は元コード由来で scope 外)
