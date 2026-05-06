## 1. entities/reservation の新設

- [x] 1.1 `apps/reservation/src/entities/reservation/model/reservation.types.ts` に `Reservation` / `ReservationId` (Branded Type) / `ReservationStatus` 型を定義
- [x] 1.2 `apps/reservation/src/entities/reservation/lib/format-reservation-number.ts` に `formatReservationNumber(id: ReservationId): string` を実装 (Crockford Base32 / `#HQ-XXXX-XXXX` 形式・I/L/O/U 除外)
- [x] 1.3 `apps/reservation/src/entities/reservation/lib/format-reservation-number.spec.ts` で決定性 + 衝突簡易検証 (1000 UUID で重複なし) のテスト
- [x] 1.4 `apps/reservation/src/entities/reservation/index.ts` で Public API を export

## 2. shared/ui に Dialog を取り込み (shadcn-vue)

- [x] 2.1 admin 側で取り込み済の AlertDialog プリミティブ群 (radix-vue ベース) を `apps/reservation/src/shared/ui/` に複製
- [x] 2.2 Tailwind preset utility 経由で着色 (admin 実装そのまま流用、生 hex / px 直書きなし)
- [x] 2.3 radix-vue 標準で `role="alertdialog"` / focus trap / Escape close が提供されることを確認
- [x] 2.4 `apps/reservation/src/shared/ui/AlertDialog.spec.ts` で open / role / title / description / cancel / action の描画を検証
- [x] 2.5 `apps/reservation/src/shared/ui/index.ts` で AlertDialog 系を export

## 3. features/booking - composable レイヤ

- [x] 3.1 `apps/reservation/src/features/booking/composables/useBookingDraft.ts` で localStorage 保持 (キー `hq:reservation-booking:<eventId>`)・初期化時 prune・破棄 API
- [x] 3.2 `apps/reservation/src/features/booking/composables/useBookingDraft.spec.ts` で復元 / イベント別独立 / event 終了超過の自動破棄をテスト
- [x] 3.3 `apps/reservation/src/features/booking/api/booking-client.ts` で reservations の INSERT / UPDATE (キャンセル) を Supabase 経由で実装
- [x] 3.4 `apps/reservation/src/features/booking/composables/useCreateBooking.ts` で INSERT + UNIQUE 違反 (23505) を「重複予約」エラーに変換
- [x] 3.5 `apps/reservation/src/features/booking/composables/useCancelBooking.ts` で キャンセル可否判定 (`events.start_at > now()`) + UPDATE + RLS エラーハンドリング
- [x] 3.6 各 composable の spec を追加 (重複予約エラー / RLS 0 行更新 / start_at 前後判定 / cancel_deadline は判定に使われないことを明示するテスト)

## 4. features/booking - UI コンポーネント

- [x] 4.1 `apps/reservation/src/features/booking/ui/BookingForm.vue` (FormField 経由・phone 条件表示・初期赤枠なし・(必須) ラベル)
- [x] 4.2 `apps/reservation/src/features/booking/ui/BookingReadOnlyProfile.vue` (氏名・メール・経験レベルの読み取り専用表示 + プロフィール画面誘導リンク)
- [x] 4.3 `apps/reservation/src/features/booking/ui/BookingTotalCard.vue` (合計金額カード・黒背景・即時計算)
- [x] 4.4 `apps/reservation/src/features/booking/ui/BookingDoneSummary.vue` (予約番号 + 次アクション、map_url 条件表示)
- [x] 4.5 `apps/reservation/src/features/booking/ui/CancelBookingDialog.vue` (ConfirmDialog + 開催開始以降は内容切替 + 問い合わせ案内)
- [x] 4.6 BookingTotalCard.spec.ts で計算ロジックの主要シナリオを検証 (他 UI は Page 経由の component test でカバー)
- [x] 4.7 `apps/reservation/src/features/booking/index.ts` で Public API を export

## 5. Page と routing

- [x] 5.1 ~~`BookingConfirmPage.vue` 新設~~ → UX 検討の結果 Bottom Sheet 化したため廃止 (`BookingSheet.vue` に再構成)
- [x] 5.2 `apps/reservation/src/pages/BookingDonePage.vue` 新設 (DONE 表記 + BookingDoneSummary + キャンセル動線、reservation クエリ未指定なら一覧へリダイレクト)
- [x] 5.3 `apps/reservation/src/app/router.ts` に `/events/:id/book/done` (name: `booking-done`) を追加 (booking-confirm ルートは持たない、Sheet 採用のため)
- [x] 5.4 BookingSheet / BookingDonePage の component test で sheet 開閉 + happy path + リダイレクト挙動をカバー
- [x] 5.5 `shared/ui/Sheet` 系プリミティブ (Sheet / SheetContent / SheetTitle / SheetDescription) を radix-vue DialogRoot ベースで取り込み、`shared/ui/index.ts` で export
- [x] 5.6 `features/booking/ui/BookingSheet.vue` 新設 (BookingForm + BookingTotalCard + 戻る / 確定 CTA を sheet 内に統合)
- [x] 5.7 EventDetailPage が BookingSheet を直接マウントし、`bookingSheetOpen` を ref で管理

## 6. EventDetailPage StickyCta の遷移先変更

- [x] 6.1 `apps/reservation/src/features/event-detail/ui/EventStickyCta.vue` の「準備中」案内を撤廃
- [x] 6.2 「予約に進む」CTA で `router.push({ name: 'booking-confirm', params: { id: eventId } })` に遷移
- [x] 6.3 EventDetailPage / EventStickyCta の component test を新挙動に合わせて更新 (グループ 7 で実装)

## 7. happy path の component test

- [x] 7.1 BookingConfirmPage → BookingDonePage の予約成立フロー (component test、ルーター mock で遷移検証)
- [x] 7.2 「修正する」でイベント詳細に戻り、再度「予約に進む」で BookingConfirmPage に到達した時に入力内容が保持されることを検証
- [x] 7.3 キャンセル可能 (start_at > now()) な予約の DonePage からのキャンセル成功フロー
- [x] 7.4 開催開始以降 (start_at <= now()) の予約で CTA 非描画 + 問い合わせ案内表示
- [x] 7.5 重複予約 INSERT 時に確認画面でエラー表示
- [x] 7.6 members.phone 登録済 / 未登録 で電話番号入力欄の表示分岐
- [x] 7.7 `events.cancel_deadline` が過去日時でも `start_at > now()` ならキャンセル可能であることを検証 (cancel_deadline 非参照の保証)

## 8. 仕上げ確認

- [x] 8.1 `pnpm --filter @high-q/reservation typecheck` / `test` がすべて pass (lint script 未設定のため対象外)
- [x] 8.2 `pnpm --filter @high-q/reservation build` が pass
- [ ] 8.3 ローカル `pnpm --filter @high-q/reservation dev` で予約確認 → 完了 → キャンセルの 1 サイクルを翔太郎くんと確認 (Render PR Preview は対象外のため自前ローカル起動を案内)
- [x] 8.4 デザイントークン違反 (生 hex / px / rem 直書き) が新規ファイルに無いことを grep で確認
- [x] 8.5 メール送信文言 / .ics リンク / cancel_deadline 時刻フォーマットが完了画面 DOM に **無いこと** を grep で確認 (コード側のみコメント参照あり、UI には未露出)
- [x] 8.6 `events.cancel_deadline` を参照するコードが本 change で追加されていないことを grep で確認 (MVP2 へ押し下げの保証)
