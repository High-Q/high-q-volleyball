## 1. データ層 — 単一取得 API

- [x] 1.1 `entities/reservation/api/myReservation.ts` を新規作成し、`fetchMyReservation(reservationId, uid)` を実装する。`reservations × events × venues × members` JOIN + `.eq("member_id", uid)` 二重防衛 / 0 行ヒット時 `null` 返却 / Branded Type 経由で `MyReservationDetail` に変換
- [x] 1.2 `MyReservationDetail` 型を `entities/reservation/model/reservation.types.ts` に追加 (`createdAt` / `member.experienceLevel` を含む)
- [x] 1.3 `entities/reservation/index.ts` の Public API に `fetchMyReservation` / `MyReservationDetail` を re-export する
- [x] 1.4 `myReservation.spec.ts` で TDD (RLS による他会員 0 行 / 自分の予約 1 行 / 存在しない UUID 0 行 / member_id 条件がクエリに含まれることの検証)

## 2. キャンセル可否ロジック (前日中まで)

- [x] 2.1 `features/booking/composables/useCancelBooking.ts` の `isCancellable` を JST カレンダー基準で「now の JST 日 < start_at の JST 日」のときのみ true を返す実装に変更
- [x] 2.2 `useCancelBooking.spec.ts` の `isCancellable` テストを「開催前日 23:59 JST 可 / 当日 0:00 JST 以降不可 / 開催後不可 / cancel_deadline 無視」の 7 ケースに更新
- [x] 2.3 `features/booking/ui/CancelBookingDialog.vue` の不可案内文言を「キャンセル期限 (開催前日中) を過ぎているためキャンセルできません」に変更

## 3. 詳細画面 widgets

- [x] 3.1 `widgets/reservation-detail-card/lib/format-countdown.ts` を新規作成し、`formatCountdownLabel(startAt, now)` で「— あと N 日」/ 「— 当日」/ 「— 開催終了」を返す pure function を実装する
- [x] 3.2 `format-countdown.spec.ts` で TDD (8 日後 / 同日 / 開催終了 / JST 跨ぎの境界)
- [x] 3.3 `widgets/reservation-detail-card/ui/DarkFactCard.vue` を新規作成。kicker (countdown) + 開催日 (MM / DD + 曜日略号) + 時間 + 会場名を ink 背景で描画
- [x] 3.4 `widgets/reservation-detail-card/ui/ReservationMetaTable.vue` を新規作成。`<dl>` / `<dt>` / `<dd>` で 4 行（参加費 / 同伴者 / 経験レベル / 予約日時）を描画。経験レベルラベルマップを内包
- [x] 3.5 `widgets/reservation-detail-card/ui/CancelPolicyBox.vue` を新規作成。kicker `— CANCEL POLICY` + 「キャンセル期限は開催前日中」+ LINE オープンチャット導線
- [x] 3.6 各 widget に component test を追加（描画内容 / props 変化での再描画）
- [x] 3.7 `widgets/reservation-detail-card/index.ts` に Public API を集約

## 4. ルーティングと Page

- [x] 4.1 `apps/reservation/src/app/router.ts` に `/reservations/:reservationId` (name: `reservation-detail`) のルートを追加し、auth guard チェーン配下に置く
- [x] 4.2 `pages/ReservationDetailPage.vue` を新規作成。状態 (loading / notFound / error / reservation) を ref 管理し、`fetchMyReservation` を `onMounted` で呼ぶ
- [x] 4.3 ReservationDetailPage に PageBreadcrumb (`マイページ > 履歴 > 予約詳細`) + Top Bar (戻る矢印 + 「予約詳細」見出し) を配置
- [x] 4.4 ReservationDetailPage の Success 状態で Reservation Header (kicker + h1) / DarkFactCard / ReservationMetaTable / CancelPolicyBox / 「予約をキャンセル」ボタンの順に組み立てる
- [x] 4.5 ReservationDetailPage に CancelBookingDialog + useCancelBooking 連携を実装。成功時 `router.replace({ name: 'history' })` + 完了トースト
- [x] 4.6 4 状態 (Loading / 404 / Error / Success) の skeleton / メッセージ / 再試行 / 履歴に戻る CTA を実装
- [x] 4.7 `ReservationDetailPage.spec.ts` を作成し、各状態描画 / キャンセル成功後遷移 / 他会員予約 ID で 404 を検証 / 地図・カレンダー CTA が描画されないことも検証

## 5. 履歴画面 (#211) からの遷移化

- [x] 5.1 `features/history-list/ui/HistoryRow.vue` の最外側 `<article>` を `<router-link :to="{ name: 'reservation-detail', params: { reservationId: item.id } }">` に置換し、cursor: pointer / hover / focus 可視リングのスタイルを再活性化
- [x] 5.2 行内のキャンセルボタンに `@click.stop.prevent` を追加し、router-link への伝播を抑制
- [x] 5.3 `HistoryRow.spec.ts` の既存「行は押下不可」スペックを「行押下で `/reservations/<id>` に遷移する」スペックに置換し、キャンセルボタン押下時に router-link が発火しないことも検証

## 6. 最終検証

- [x] 6.1 `pnpm exec vitest run` を実行し、新規 / 修正された全テストが pass することを確認
- [x] 6.2 `pnpm exec vue-tsc --noEmit` を実行し、型エラー 0 を確認
- [x] 6.3 `apps/reservation` の Playwright E2E に「未認証 `/reservations/<uuid>` → `/login`」シナリオを 1 件追加
- [x] 6.4 マジックナンバー (生の色コード / px 値 / rem 値の直書き) が新規ファイルに存在しないことを grep で確認
- [ ] 6.5 ローカルで `/history` → 任意行クリック → `/reservations/:id` 遷移 → キャンセル成功で `/history` 戻り、を 1 サイクル動作確認 (← 翔太郎くんによる目視確認待ち)
- [ ] 6.6 390px viewport (Chrome DevTools mobile mode) で横スクロール 0 / Dark Fact Card の AA コントラストを確認 (← 翔太郎くんによる目視確認待ち)
