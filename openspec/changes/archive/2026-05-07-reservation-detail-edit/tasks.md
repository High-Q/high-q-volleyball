## 1. スコープオフ確認・前提検証

- [x] 1.1 関連 spec (`reservation-booking-flow` / `reservation-detail-page` / `data-schema` / `rls-policies`) の MVP1 スコープオフ項目を再確認し、編集 sheet に組み込んではいけない要素 (メール通知 / .ics / 監査ログ / 編集履歴等) のリストを抽出して proposal の Non-Goals と整合確認
- [x] 1.2 既存 `reservations` UPDATE RLS ポリシー (`20260426000000_init_high_q.sql` L314-329) を確認済: WITH CHECK は `member_id = auth.uid() AND status IN ('reserved', 'cancelled')` であり `guest_count` / `note` の本人 UPDATE は実装上既に通る。SQL migration 追加は不要。本 change では rls-policies spec の文言を実装と整合させる MODIFIED delta のみ追加 (specs/rls-policies/spec.md として既出)
- [x] 1.3 既存 `BookingSheet.vue` / `BookingForm.vue` / `useCreateBooking.ts` / `useBookingDraft.ts` / `booking-client.ts` を読み、create モードの責務分担を把握。設計判断: ① `BookingForm.vue` は変更不要 (reactive draft mutate API 維持) ② edit モードでは `useBookingDraft` を呼ばず `BookingSheet` 内で reactive draft を props 由来で初期化 ③ 差分検知は Sheet 側で computed ④ `BookingError` に `not_editable` を追加 (既存 `not_cancellable` と同型の期限超過分類) ⑤ `MyReservationDetail` に `note` を追加 (編集初期値供給のため fetchMyReservation の SELECT 句にも追加) — 既存 spec の reservation-detail-page にも該当する読み取り API 拡張なので Apply 中に内包する

## 2. データアクセス層 (entities / features API)

- [x] 2.1 `apps/reservation/src/features/booking/api/booking-client.ts` に `updateReservation(input: UpdateBookingInput)` を追加。`.update().eq("id").eq("member_id").eq("status","reserved").select(...)` で二重防衛。0 行更新時は `BookingApiError("rls")`、エラー時は既存 `mapPostgrestError` で kind 分岐。返却は既存 pattern に揃え `Reservation` を resolve / `BookingApiError` を throw
- [x] 2.2 2.1 に対する spec を `booking-client.spec.ts` に追加。シナリオ: 自分の reserved 行は更新成功 / payload に status を含めない (guest_count + note のみ) / 空 note は NULL 化 / 0 行更新で 'rls' / 42501 で 'rls' / その他で 'network'。期限判定は本層では弾かず UI 層で弾く責務分離は別タスク (3.1) で composable 層が担保

## 3. composable 層

- [x] 3.1 `apps/reservation/src/features/booking/composables/useUpdateBooking.ts` を新規作成。`useCreateBooking` 互換シグネチャ。`isCancellable` 流用、期限切れ時は API 呼ばず `error.value = 'not_editable'` を返す
- [x] 3.2 `useUpdateBooking.spec.ts` 新規。期限内で API 成功 / 期限外で `not_editable` / RLS / network / unknown / 二重送信防止
- [x] 3.3 採用方針: `useBookingDraft.ts` には手を入れず、edit モードでは BookingSheet 側で reactive draft を独立管理 (localStorage 非接触)。create / edit のコード共有は維持しつつ責務を分離する設計
- [x] 3.4 `BookingSheet.spec.ts` に「edit モードで sheet を開閉しても localStorage に書き込みが発生しない」シナリオを追加して assert (3.3 の方針を spec で担保)

## 4. UI 層 — Sheet / Form の mode 拡張

- [x] 4.1 採用方針: `BookingForm.vue` は変更しない (reactive draft mutate API はそのまま). `BookingSheet.vue` に mode / edit (reservationId, initialGuestCount, initialNote) props を追加し、edit モードでは内部で別 reactive draft を初期化。Form は両モードで同一の入力 UI として再利用
- [x] 4.2 差分検知 (現在値 = 初期値で disabled) を `BookingSheet.vue` の `submitDisabled` computed で実装。edit モード時のみ有効、create モードには影響させない
- [x] 4.3 `BookingSheet.vue` に kicker / CTA ラベル / 成功時ハンドラのモード分岐を実装 (create: router.push booking-done / edit: emit 'saved' + sheet close)
- [x] 4.4 `BookingSheet.spec.ts` に edit モードシナリオ追加: 初期値描画 / 差分なし disabled / 値変更で活性化 / 元に戻すと再 disabled / 期限切れ案内 / 保存成功で saved emit + sheet close / RLS エラー時 sheet 留まり

## 5. 予約詳細画面への編集 CTA 配置

- [x] 5.1 `ReservationDetailPage.vue` の Meta テーブル直下に「予約内容を変更する」CTA を `@high-q/ui` の `Button variant="secondary"` で配置。destructive 系キャンセル CTA との階層分離は CancelPolicyBox を間に挟む配置で担保
- [x] 5.2 `isCancellable` 流用で CTA 活性 / 非活性制御。`status !== 'reserved'` で CTA 自体を非表示。期限切れは「CTA 非活性」採用 (押下時の案内は edit sheet 側で表示する設計)
- [x] 5.3 CTA 押下で `BookingSheet` を edit モードで開く。初期値は `reservation.value.guestCount / note` から渡す
- [x] 5.4 saved emit で `reservation.value` を楽観的に書き換え、Meta テーブルが新値で再描画。完了トーストは Page の `successNotice` で「変更を保存しました」を表示 (Sheet 側はトーストを発火しない設計に変更)
- [x] 5.5 `ReservationDetailPage.spec.ts` に編集動線シナリオ追加: CTA 活性 / cancelled で非表示 / 期限切れで非活性 / 配置順序 / saved emit で Meta 再描画 + 完了トースト

## 6. メタテーブル widget の連動更新

- [x] 6.1 `ReservationMetaTable.vue` は既に `guestCount` を props 受領 + computed で reactive 描画。Page 側 `reservation.value` の楽観的更新で再描画される構造になっており、追加実装不要 (note は表示要件外なので props 追加もしない)
- [x] 6.2 `ReservationMetaTable.spec.ts` に「guestCount props の変化で同伴者行が即時再描画される」シナリオ追加

## 7. テスト・型・Lint・ビルド最終確認

- [x] 7.1 `pnpm --filter @high-q/reservation test` を実行し 523 tests pass
- [x] 7.2 `pnpm --filter @high-q/reservation typecheck` で違反 0。ESLint boundaries チェックは reservation アプリ向けに未整備 (LP のみ実装) のため本 change のスコープ外
- [x] 7.3 `pnpm --filter @high-q/reservation build` でビルド成功 (340 modules transformed)
- [ ] 7.4 dev 環境 Supabase に対する手動動作確認 (翔太郎くん実機): 自分の予約を編集成功 / 他人の id 改ざんで RLS エラー / 期限切れで案内表示 / 保存成功で Meta テーブル再描画 / 完了トースト 1 回のみ
- [ ] 7.5 spec とドキュメントの整合最終チェック: openspec/changes/reservation-detail-edit/ 配下の proposal / design / specs / tasks に齟齬がないか通読

## 8. 出荷準備

- [ ] 8.1 PR 説明文にスクリーンショット (編集 CTA / edit sheet / 期限切れ時の案内) を添付
- [ ] 8.2 Render Preview の対象判定: 本変更は `apps/reservation` のみで `apps/lp` を含まないため、PR 文言は「Render Preview は出ない (admin/reservation のみのため)」テンプレートを使用 (memory `feedback_render_preview_scope.md`)
- [ ] 8.3 `/opsx-ship` の前段として翔太郎くんの実機確認 OK を待ち、その後 sync → archive → push → merge → ブランチ削除 + Issue クローズの順で出荷
