## 1. RLS ポリシー migration（root-cause）

- [x] 1.1 `supabase/migrations/<ts>_reservations_member_status_boundary.sql` を追加。`reservations_insert_self` を差し替え、会員の WITH CHECK を `member_id is not null and member_id = auth.uid() and status in ('reserved','waitlist')`（admin は従来どおり全 status）へ厳格化。`reservations_update_self_cancel` を差し替え、会員の WITH CHECK を `member_id = auth.uid() and status in ('reserved','cancelled','waitlist')` へ拡張（USING は不変）。両ポリシーとも `drop policy if exists` → `create policy` の冪等パターン + 末尾に `-- ROLLBACK:`（旧定義の再 create SQL）コメントを記す。
- [x] 1.2 dev DB へ `supabase db push`（レム実行）。`supabase db query --linked` でステータス境界を検証: 会員ロールで `waitlist` INSERT 可 / `attended` INSERT 不可 / `cancelled→waitlist` UPDATE 可 / `attended` UPDATE 不可、admin は全 status 可。結果を提示。

## 2. booking API: キャンセル待ち作成と再活性化（TDD）

- [x] 2.1 `apps/reservation/src/features/booking/api/booking-client.spec.ts` に `insertWaitlist` のテストを先に追加: (a) 未登録で `status='waitlist'` 行作成、(b) UNIQUE 違反(23505) + 既存 `cancelled` 行 → `waitlist` へ再活性化（guest_count/note/phone 上書き・cancelled_at=null）、(c) 既存 `reserved`/`waitlist` 行 → `duplicate` エラー。
- [x] 2.2 `booking-client.ts` に `insertWaitlist(input)` を実装（既存 `insertReservation` と対称。INSERT 時に `status: 'waitlist'` を明示。23505 捕捉時の再活性化は既存 `reactivateCancelledReservation` を waitlist 対応に一般化、既存 `reserved` 行は `duplicate`、既存 `waitlist` 行も `duplicate` として扱う）。
- [x] 2.3 `apps/reservation/src/features/booking/composables/useCreateWaitlist.ts` + spec を追加（`useCreateBooking` と対称。`triggerReservationNotification` は呼ばない。`submitting`/`error`/`reservation`/`create`/`reset` を返す）。`features/booking/index.ts` で公開。

## 3. 自己予約状態の取得（TDD）

- [x] 3.1 `apps/reservation/src/entities/reservation/api/myEventReservation.ts` + spec を追加: `(reservationId 不明前提で) event_id + member_id` で当該会員の当該イベント行（`id`/`status`/`guest_count`/`note`）を取得。`.eq('event_id', ...).eq('member_id', uid)` を明示し RLS と二重防衛。0 行は `null`（未登録）。`entities/reservation/index.ts` で公開。
- [x] 3.2 `features/event-detail/composables/useMyEventReservation.ts`（または `useEventDetail` を拡張）で自己予約状態 ref を提供。イベント本体と並行取得し、取得失敗時は `null` を返して CTA を安全側に倒す。

## 4. キャンセル待ち登録 UI（Sheet 再利用）

- [x] 4.1 `BookingSheet.vue` に `mode='waitlist'` を追加。waitlist 時: kicker「— Waitlist」/ 見出し・説明文をキャンセル待ち向け文言に / `BookingTotalCard` を非表示 / 確定 CTA「キャンセル待ちに登録する」（処理中「登録中...」）/ `useBookingDraft`（localStorage）非連動 / `BookingForm` の同伴者数 stepper は表示（連絡事項は予約と同様）。
- [x] 4.2 `onSubmit` の waitlist 分岐で `useCreateWaitlist.create()` を呼び、成功時は完了画面へ遷移せず `saved` 相当イベントで親に通知して閉じる。電話は `members.phone` をスナップショット。エラー文言は既存 `submissionErrorMessage`（duplicate/rls/network）を流用しつつ duplicate を「既にキャンセル待ち登録済みです。」相当に。

## 5. イベント詳細 CTA 分岐 + フィードバック

- [x] 5.1 `EventStickyCta.vue` を拡張: props に自己予約状態を受け、満員時を分岐 — 未登録→「キャンセル待ちに登録」(押下可・`@waitlist` emit) / `waitlist` 登録済み→「キャンセル待ち登録済み」(無効) / `reserved`→ キャンセル待ち CTA 非描画。capacity NULL は従来の「予約に進む」。自己予約状態 fetch 失敗時は満員で従来の無効「予約締切」。
- [x] 5.2 `EventDetailPage.vue` で自己予約状態を `EventStickyCta` と `BookingSheet`(waitlist) に配線。`@waitlist` で waitlist シート起動。登録成功(`saved`)で完了トースト（既存 Toast 系を流用）を表示し、自己予約状態を楽観的に `waitlist` へ更新して CTA を「登録済み」に即時切替。

## 6. 最終確認（UI 変更まとめてテスト・ビルド）

- [x] 6.1 不足分の component / unit テストを追加（新 capability spec の「主要シナリオ」: CTA 3 分岐 / 合計金額カード非表示 / waitlist 作成・再活性化 / 二重登録拒否 / 完了フィードバック / 自己予約状態が自分の行限定）。既存予約フロー（新規予約・再予約・キャンセル・編集）の回帰を確認。
- [x] 6.2 `pnpm --filter @high-q/reservation test` と `pnpm build`（該当アプリ）をまとめて 1 回実行し、緑を確認。lint / 型エラーがないことを確認。

## 7. UI フィードバック対応: キャンセル待ちの可視化と解除 (#344 追加)

- [x] 7.1 booking-client に `cancelWaitlistReservation(id)` (waitlist→cancelled UPDATE、`.eq("status","waitlist")`) を TDD で追加。
- [x] 7.2 useCancelBooking に `cancelWaitlist(id)` を追加 (通知メールは送らない)。TDD。
- [x] 7.3 splitReservations に `waitlist` グループ (status='waitlist' AND 未来、ASC) を追加し past から除外。TDD。
- [x] 7.4 CancelBookingDialog に `kind?: 'reservation'|'waitlist'` を追加 (waitlist は日付ゲート無しで常に解除可、文言差し替え)。HistoryRow に `cancelLabel?` prop 追加し HistoryGroup から pass-through。
- [x] 7.5 EventRow に waitlist バッジ追加。useNextReservation に `waitlistByEventId` map (status='waitlist'+未来) を追加し EventsListPage から配線。
- [x] 7.6 HistoryPage にキャンセル待ちグループ描画 + 解除ダイアログ (kind=waitlist) 配線。ReservationDetailPage に status='waitlist' 時の「キャンセル待ちを取り消す」CTA を追加。
- [x] 7.7 specs 更新 (history-page MODIFIED / waitlist-registration ADDED / events-and-booking MODIFIED) + component テスト追加 + 全スイート/typecheck/build。
