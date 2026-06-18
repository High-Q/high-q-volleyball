## 1. RLS ポリシー migration（root-cause）

- [ ] 1.1 `supabase/migrations/<ts>_reservations_member_status_boundary.sql` を追加。`reservations_insert_self` を差し替え、会員の WITH CHECK を `member_id is not null and member_id = auth.uid() and status in ('reserved','waitlist')`（admin は従来どおり全 status）へ厳格化。`reservations_update_self_cancel` を差し替え、会員の WITH CHECK を `member_id = auth.uid() and status in ('reserved','cancelled','waitlist')` へ拡張（USING は不変）。両ポリシーとも `drop policy if exists` → `create policy` の冪等パターン + 末尾に `-- ROLLBACK:`（旧定義の再 create SQL）コメントを記す。
- [ ] 1.2 dev DB へ `supabase db push`（レム実行）。`supabase db query --linked` でステータス境界を検証: 会員ロールで `waitlist` INSERT 可 / `attended` INSERT 不可 / `cancelled→waitlist` UPDATE 可 / `attended` UPDATE 不可、admin は全 status 可。結果を提示。

## 2. booking API: キャンセル待ち作成と再活性化（TDD）

- [ ] 2.1 `apps/reservation/src/features/booking/api/booking-client.spec.ts` に `insertWaitlist` のテストを先に追加: (a) 未登録で `status='waitlist'` 行作成、(b) UNIQUE 違反(23505) + 既存 `cancelled` 行 → `waitlist` へ再活性化（guest_count/note/phone 上書き・cancelled_at=null）、(c) 既存 `reserved`/`waitlist` 行 → `duplicate` エラー。
- [ ] 2.2 `booking-client.ts` に `insertWaitlist(input)` を実装（既存 `insertReservation` と対称。INSERT 時に `status: 'waitlist'` を明示。23505 捕捉時の再活性化は既存 `reactivateCancelledReservation` を waitlist 対応に一般化、既存 `reserved` 行は `duplicate`、既存 `waitlist` 行も `duplicate` として扱う）。
- [ ] 2.3 `apps/reservation/src/features/booking/composables/useCreateWaitlist.ts` + spec を追加（`useCreateBooking` と対称。`triggerReservationNotification` は呼ばない。`submitting`/`error`/`reservation`/`create`/`reset` を返す）。`features/booking/index.ts` で公開。

## 3. 自己予約状態の取得（TDD）

- [ ] 3.1 `apps/reservation/src/entities/reservation/api/myEventReservation.ts` + spec を追加: `(reservationId 不明前提で) event_id + member_id` で当該会員の当該イベント行（`id`/`status`/`guest_count`/`note`）を取得。`.eq('event_id', ...).eq('member_id', uid)` を明示し RLS と二重防衛。0 行は `null`（未登録）。`entities/reservation/index.ts` で公開。
- [ ] 3.2 `features/event-detail/composables/useMyEventReservation.ts`（または `useEventDetail` を拡張）で自己予約状態 ref を提供。イベント本体と並行取得し、取得失敗時は `null` を返して CTA を安全側に倒す。

## 4. キャンセル待ち登録 UI（Sheet 再利用）

- [ ] 4.1 `BookingSheet.vue` に `mode='waitlist'` を追加。waitlist 時: kicker「— Waitlist」/ 見出し・説明文をキャンセル待ち向け文言に / `BookingTotalCard` を非表示 / 確定 CTA「キャンセル待ちに登録する」（処理中「登録中...」）/ `useBookingDraft`（localStorage）非連動 / `BookingForm` の同伴者数 stepper は表示（連絡事項は予約と同様）。
- [ ] 4.2 `onSubmit` の waitlist 分岐で `useCreateWaitlist.create()` を呼び、成功時は完了画面へ遷移せず `saved` 相当イベントで親に通知して閉じる。電話は `members.phone` をスナップショット。エラー文言は既存 `submissionErrorMessage`（duplicate/rls/network）を流用しつつ duplicate を「既にキャンセル待ち登録済みです。」相当に。

## 5. イベント詳細 CTA 分岐 + フィードバック

- [ ] 5.1 `EventStickyCta.vue` を拡張: props に自己予約状態を受け、満員時を分岐 — 未登録→「キャンセル待ちに登録」(押下可・`@waitlist` emit) / `waitlist` 登録済み→「キャンセル待ち登録済み」(無効) / `reserved`→ キャンセル待ち CTA 非描画。capacity NULL は従来の「予約に進む」。自己予約状態 fetch 失敗時は満員で従来の無効「予約締切」。
- [ ] 5.2 `EventDetailPage.vue` で自己予約状態を `EventStickyCta` と `BookingSheet`(waitlist) に配線。`@waitlist` で waitlist シート起動。登録成功(`saved`)で完了トースト（既存 Toast 系を流用）を表示し、自己予約状態を楽観的に `waitlist` へ更新して CTA を「登録済み」に即時切替。

## 6. 最終確認（UI 変更まとめてテスト・ビルド）

- [ ] 6.1 不足分の component / unit テストを追加（新 capability spec の「主要シナリオ」: CTA 3 分岐 / 合計金額カード非表示 / waitlist 作成・再活性化 / 二重登録拒否 / 完了フィードバック / 自己予約状態が自分の行限定）。既存予約フロー（新規予約・再予約・キャンセル・編集）の回帰を確認。
- [ ] 6.2 `pnpm --filter @high-q/reservation test` と `pnpm build`（該当アプリ）をまとめて 1 回実行し、緑を確認。lint / 型エラーがないことを確認。
