## 1. Edge Function バリデーション拡張

- [x] 1.1 `supabase/functions/_shared/validation.ts` の `ReservationNotificationPayload.eventType` 許容値を `'confirmed' | 'cancelled' | 'updated'` に拡張する型・スキーマ判定を更新する
- [x] 1.2 `validateReservationNotificationPayload` の振る舞いをテストする `supabase/functions/_shared/validation.test.ts` (新規) で `eventType: 'updated'` の正常ケース、未知 eventType の弾きケース、その他必須項目の挙動を Vitest で検証する

## 2. 変更通知メールレンダラ追加

- [x] 2.1 `supabase/functions/_shared/mailer-templates.ts` に `renderReservationUpdatedMail` 純粋関数を追加する（入力 type は `ReservationConfirmedInput` を再利用、戻り値は `{ subject, body }`）
- [x] 2.2 件名は `【High Q】ご予約内容変更のお知らせ (#HQ-XXXX-XXXX)` 相当の固定書式とし、本文冒頭は「予約内容を更新しました」が伝わる文言に差し替える。会場 / 住所 / 集合地点 / マップ / 同伴者数 / 合計金額 / 連絡事項 / LINE オープンチャット URL / マイページ URL / supportNote のレイアウトは予約完了メールに揃える
- [x] 2.3 `supabase/functions/_shared/mailer-templates.test.ts` (新規 or 既存に追記) で以下を検証: (a) 件名 / 本文冒頭に「予約完了」表現が含まれないこと (b) 件名・本文に予約番号 `#HQ-XXXX-XXXX` が含まれること (c) 連絡事項が空のとき連絡事項セクションが描画されないこと (d) 集合地点 NULL / 値あり両ケースの分岐 (e) 同伴者数と合計金額が変更後の値で正しく描画されること

## 3. Edge Function 本体に updated 分岐を実装

- [x] 3.1 `supabase/functions/send-reservation-notification/index.ts` の `eventType` 分岐に `'updated'` ケースを追加し、`buildConfirmedInput` を流用しつつ `renderReservationUpdatedMail` を呼んで `{ subject, body }` を組み立てる
- [x] 3.2 ログ出力 (`[send-reservation-notification] sent ok / sendMail failed / build/render failed`) の eventType フィールドに `updated` がそのまま乗り、相関キー (reservationId / memberId) が完了 / キャンセル経路と同じ粒度で残ることを確認する
- [x] 3.3 既存の member_id 改ざんガード / status チェックは新 eventType でも変えず、SELECT 経路を共通化する

## 4. アプリ層 helper の eventType 拡張

- [x] 4.1 `apps/reservation/src/shared/api/reservation-notification.ts` の `triggerReservationNotification` の `eventType` 引数 type に `'updated'` を追加する
- [x] 4.2 既存の fire-and-forget 流儀（例外を握りつぶす / `console.warn` でログ）を新値でも維持する。Edge Function 呼び出し失敗が編集成立を妨げない構造を変えない

## 5. useUpdateBooking から fire-and-forget 呼び出し

- [x] 5.1 `apps/reservation/src/features/booking/composables/useUpdateBooking.spec.ts` に「UPDATE 成功時に `triggerReservationNotification(reservationId, 'updated')` が 1 回呼ばれる」「期限外で `not_editable` のときは呼ばれない」「`BookingApiError('rls')` 等の失敗時は呼ばれない」「helper が throw しても update() は成功扱いを返す」ケースを追加する（`useCreateBooking.spec.ts` の流儀に揃える）
- [x] 5.2 `apps/reservation/src/features/booking/composables/useUpdateBooking.ts` の `update()` 成功直後で `void triggerReservationNotification(result.id as string, 'updated')` を `try` で二重防衛しつつ発火する。RLS / 期限切れ / 失敗時は発火させない

## 6. 既存仕様との整合性確認

- [x] 6.1 `apps/reservation/src/features/booking/index.ts` の Public API に変更が必要かを確認する（型を流用するだけであれば変更不要）
- [x] 6.2 `openspec validate reservation-update-email --strict` を実行して spec delta / proposal / tasks の整合性を検証する

## 7. 最終確認

- [x] 7.1 `pnpm exec vitest run` を Edge Function 共有関数 / `useUpdateBooking` を含む対象スコープで実行し、全テストグリーンを確認する
- [x] 7.2 `pnpm --filter reservation build` でアプリ層のビルドが成功することを確認する（型エラー / import パス不整合がないこと）
- [x] 7.3 dev 環境 (許可リスト宛のみ送信) で手動 E2E: 既存予約を編集し、編集後の同伴者数 / 連絡事項 / 合計金額が反映されたメールが許可リスト宛に届くこと、件名・本文冒頭が「予約完了」と混同されない文言になっていることを確認する
- [x] 7.4 dev 環境で「期限切れ (開催当日 0:00 JST 以降) 編集」「RLS 違反相当の他会員予約への編集試行」が走った場合にメールが送信されないことをログで確認する
