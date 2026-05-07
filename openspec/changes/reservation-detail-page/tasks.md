## 1. データ層 — 単一取得 API

- [x] 1.1 `entities/reservation/api/myReservation.ts` を新規作成し、`fetchMyReservation(reservationId, uid)` を実装する。`reservations × events × venues × members` JOIN + `.eq("member_id", uid)` 二重防衛 / 0 行ヒット時 `null` 返却 / Branded Type 経由で `MyReservationDetail` に変換
- [x] 1.2 `MyReservationDetail` 型を `entities/reservation/model/reservation.types.ts` に追加。`MyReservationItem` を拡張し、`note` / `createdAt` / `event.venueAddress` / `event.venueMapUrl` / `member.experienceLevel` を追加する
- [x] 1.3 `entities/reservation/index.ts` の Public API に `fetchMyReservation` / `MyReservationDetail` を re-export する
- [x] 1.4 `myReservation.spec.ts` で TDD (RLS による他会員 0 行 / 自分の予約 1 行 / 存在しない UUID 0 行 / member_id 条件がクエリに含まれることの検証)

## 2. .ics 生成ユーティリティ

- [x] 2.1 `features/calendar-export/lib/build-ics.ts` を新規作成し、`buildIcs({ reservationNumber, eventName, startAt, endAt, venueName, venueAddress })` を実装する。VERSION:2.0 / PRODID / VEVENT / UID (`reservation-{reservationId}@high-q.example` 相当) / DTSTART / DTEND (UTC + Z) / SUMMARY / LOCATION / DESCRIPTION
- [x] 2.2 `build-ics.spec.ts` で TDD (各行存在 / UID の同一性 / UTC 表記 / LOCATION 連結 / address NULL 時の会場名のみ表記)
- [x] 2.3 `features/calendar-export/composables/useIcsDownload.ts` を新規作成し、Blob → URL.createObjectURL → `<a download>` クリックでダウンロードを起動する composable を実装する
- [x] 2.4 `features/calendar-export/ui/CalendarExportButton.vue` を新規作成し、`@high-q/ui` の `Button` でラップした「カレンダーに追加 (.ics)」CTA を提供する。押下で `useIcsDownload` を呼び出す
- [x] 2.5 `features/calendar-export/index.ts` に Public API を集約

## 3. 会場地図リンク

- [x] 3.1 `features/venue-map-link/lib/build-map-url.ts` を新規作成し、`buildMapUrl(venue: { name, address, mapUrl })` を実装する。`mapUrl` 優先 / 未登録時は `https://www.google.com/maps/search/?api=1&query=` + URI エンコード済 `name + " " + address`（address NULL なら name のみ）
- [x] 3.2 `build-map-url.spec.ts` で TDD (mapUrl 優先 / address NULL 時の fallback / address 登録時の連結)
- [x] 3.3 `features/venue-map-link/ui/VenueMapLink.vue` を新規作成し、`<a target="_blank" rel="noopener noreferrer">` で「会場の地図を見る」リンクを描画する
- [x] 3.4 `features/venue-map-link/index.ts` に Public API を集約

## 4. 詳細画面 widgets

- [x] 4.1 `widgets/reservation-detail-card/` ディレクトリを新規作成し、Dark Fact Card / Meta テーブル / Cancel Policy ボックスをそれぞれ独立した Vue コンポーネントに分割する
- [x] 4.2 `widgets/reservation-detail-card/lib/format-countdown.ts` を新規作成し、`formatCountdownLabel(startAt, now)` で「— あと N 日」/ 「— 当日」/ 「— 開催終了」を返す pure function を実装する。JST カレンダー日数差で算出
- [x] 4.3 `format-countdown.spec.ts` で TDD (8 日後 / 同日 / 開催終了 / JST 跨ぎの境界)
- [x] 4.4 `widgets/reservation-detail-card/ui/DarkFactCard.vue` を新規作成。kicker (countdown) + 開催日 (MM / DD + 曜日略号) + 時間 + 会場名を ink 背景で描画
- [x] 4.5 `widgets/reservation-detail-card/ui/ReservationMetaTable.vue` を新規作成。`<dl>` / `<dt>` / `<dd>` で 4 行（参加費 / 同伴者 / 経験レベル / 予約日時）を描画。経験レベルラベルマップを内包
- [x] 4.6 `widgets/reservation-detail-card/ui/CancelPolicyBox.vue` を新規作成。kicker `— CANCEL POLICY` + 説明文 (LINE オープンチャット URL は `shared/lib/contact-channels` 経由)
- [x] 4.7 各 widget に component test を追加（描画内容 / props 変化での再描画）
- [x] 4.8 `widgets/reservation-detail-card/index.ts` に Public API を集約

## 5. ルーティングと Page

- [ ] 5.1 `apps/reservation/src/app/router.ts` に `/reservations/:reservationId` (name: `reservation-detail`) のルートを追加し、`meta.public` を持たないことで auth guard チェーン配下に置く
- [ ] 5.2 `pages/ReservationDetailPage.vue` を新規作成。状態 (loading / notFound / error / reservation) を ref 管理し、`fetchMyReservation` を `onMounted` で呼ぶ。`router.params.reservationId` を Branded Type に変換
- [ ] 5.3 ReservationDetailPage に PageBreadcrumb (`マイページ > 履歴 > 予約詳細`) + Top Bar (戻る矢印 + 「予約詳細」見出し) を配置。戻る矢印は `router.back()` 相当、履歴空時は `/history` への代替遷移
- [ ] 5.4 ReservationDetailPage の Success 状態で Reservation Header (kicker + h1) / DarkFactCard / ReservationMetaTable / CalendarExportButton / VenueMapLink / CancelPolicyBox / 「予約をキャンセル」ボタンの順に組み立てる
- [ ] 5.5 ReservationDetailPage に CancelBookingDialog + useCancelBooking 連携を実装。成功時 `router.replace({ name: 'history' })` + 完了トースト
- [ ] 5.6 4 状態 (Loading / 404 / Error / Success) の skeleton / メッセージ / 再試行 / 履歴に戻る CTA を実装
- [ ] 5.7 `ReservationDetailPage.spec.ts` を作成し、各状態描画 / .ics 起動 / 地図リンク URL / キャンセル成功後遷移 / 他会員予約 ID で 404 を検証

## 6. 履歴画面 (#211) からの遷移化

- [ ] 6.1 `features/history-list/ui/HistoryRow.vue` の最外側 `<article>` を `<router-link :to="{ name: 'reservation-detail', params: { reservationId: item.id } }">` に置換し、cursor: pointer / hover / focus 可視リングのスタイルを再活性化
- [ ] 6.2 行内のキャンセルボタンに `@click.stop` を追加し、router-link への伝播を抑制
- [ ] 6.3 `HistoryRow.spec.ts` の既存「行は押下不可」スペックを「行押下で `/reservations/<id>` に遷移する」スペックに置換し、キャンセルボタン押下時に router-link が発火しないことも検証

## 7. 最終検証

- [ ] 7.1 `pnpm --filter @high-q/reservation test` を実行し、新規 / 修正された全テストが pass することを確認
- [ ] 7.2 `pnpm --filter @high-q/reservation typecheck` を実行し、型エラー 0 を確認
- [ ] 7.3 `pnpm --filter @high-q/reservation lint` を実行し、ESLint (FSD 境界含む) が pass することを確認
- [ ] 7.4 ローカルで `/history` → 任意行クリック → `/reservations/:id` 遷移 → カレンダー追加で .ics ダウンロード成功 → 会場地図リンクで新規タブ → キャンセル成功で `/history` 戻り、を 1 サイクル動作確認
- [ ] 7.5 390px viewport (Chrome DevTools mobile mode) で横スクロール 0 / Dark Fact Card の AA コントラストを確認
- [ ] 7.6 `apps/reservation` の Playwright E2E に「未認証 `/reservations/<uuid>` → `/login`」シナリオを 1 件追加
- [ ] 7.7 `pnpm exec eslint --rule '...'` で `apps/reservation/src/{pages/ReservationDetailPage.vue,widgets/reservation-detail-card/**,features/calendar-export/**,features/venue-map-link/**}` 配下にマジックナンバー (生の色コード / px 値 / rem 値の直書き) が存在しないことを grep で確認
