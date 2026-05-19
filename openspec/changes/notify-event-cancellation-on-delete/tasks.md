## 1. Edge Function 用バリデーションと型定義

- [x] 1.1 `supabase/functions/_shared/validation.ts` に `EventCancellationNotificationPayload` 型と `validateEventCancellationNotificationPayload` 純関数を追加する。スキーマは `{ eventId: string (UUID), snapshotRecipients: { memberId: string, email: string }[], organizerMessage?: string }` を期待し、`organizerMessage` の 500 文字上限・配列の空判定・UUID 形式・email 形式を判定する
- [x] 1.2 `supabase/functions/_shared/validation.test.ts` に新ペイロードの正常ケース / 未知フィールド弾き / `organizerMessage` 上限超過 / `snapshotRecipients` 空配列の挙動 / 不正 UUID / 不正 email を検証するケースを Vitest で追加する

## 2. 通知メールレンダラ追加

- [x] 2.1 `supabase/functions/_shared/mailer-templates.ts` に `EventCancellationMailInput` 型と `renderEventCancellationMail` 純関数を追加する。入力は `{ eventName: string, startAt: string, venueName: string, organizerMessage?: string, lineOpenChatUrl: string, reservationBaseUrl: string }` の構造化データ。出力は `{ subject, body }`
- [x] 2.2 件名は `【High Q】イベント中止のお知らせ - <イベント名>` 相当の固定書式とする。本文には「対象イベント名 / 開催日時 (JST) / 会場名 / 主催者メッセージ (空欄なら理由欄を非描画) / LINE オープンチャット URL / マイページ URL / 迷惑メールフォルダ確認の案内」を含める。予約番号 (`#HQ-XXXX-XXXX`) は含めない
- [x] 2.3 `supabase/functions/_shared/mailer-templates.test.ts` に追記: (a) 件名にイベント名が含まれること (b) `organizerMessage` 空文字 / undefined のとき本文に理由欄が描画されないこと (c) `organizerMessage` ありのとき本文に当該文言が描画されること (d) 本文に `#HQ-` プレフィックス / UUID 形式の文字列を含まないこと (e) 同一入力で 2 回呼んで完全一致

## 3. Edge Function 本体の実装

- [x] 3.1 `supabase/functions/send-event-cancellation-notification/index.ts` を新規追加する。フロー: CORS preflight → POST 検証 → Authorization Bearer 取得 → JSON parse → `validateEventCancellationNotificationPayload` → `auth.getUser(token)` で auth.uid() 確定 → `members` を SELECT して `role = 'admin'` を確認（admin 以外は 403） → `_shared/mailer-policy.ts` の送信抑制 / 許可リスト判定（既存 `sendMail` 内で実施） → `renderEventCancellationMail` で文面組み立て → `sendMail` でループ送信 → 成功 / 失敗件数を構造化ログ出力 → 200 で `{ ok, sent, failed, total }` を返す
- [x] 3.2 受信者ループ内で memberId をキーに重複排除する Map を導入する。各送信は try/catch で個別に成否を記録し、1 件失敗で全体を 5xx にしない（fire-and-forget 流儀）
- [x] 3.3 ログは `[send-event-cancellation-notification]` プレフィックスで eventId / 認証 admin の memberId / 成功件数 / 失敗件数 / 失敗時のエラーコードを出力する。メールアドレスはログに残さず memberId のみで相関する
- [x] 3.4 Edge Function を `supabase functions deploy` で deploy できる構造にする（`supabase/functions/send-event-cancellation-notification/index.ts` を `Deno.serve(handleSendEventCancellationNotification)` で公開）。**handler 自体の Vitest テストは defer**: 既存 Edge Function (`send-reservation-notification` 等) と同じ慣行に従い、handler は `Deno.serve` + `npm:nodemailer` を import するため Node Vitest で直接実行できない。 `vitest.config.ts` のコメントに従い、handler 動作確認は dev `supabase functions serve` + 手動 E2E (9.4 / 9.5) で行う。受信者重複排除・バリデーション 400・organizerMessage 上限などは `_shared/` レイヤーで単体テスト済 (1.2)

## 4. アプリ層: メールアドレススナップショット取得

- [x] 4.1 `apps/admin/src/entities/event/api/eventQueries.ts` に `fetchActiveReservationRecipients(eventId)` を追加する。SELECT は `reservations` を `status in ('reserved', 'attended')` で絞り、`members(id, email)` を JOIN する。戻り値は `Result<{ memberId, email }[]>` 形式で、エラー時は `FetchError` を返す
- [x] 4.2 `apps/admin/src/entities/event/index.ts` の Public API に `fetchActiveReservationRecipients` をエクスポートに追加する
- [x] 4.3 Vitest で `fetchActiveReservationRecipients` のテストを追加する: 有効予約 0 件 / 1 件 / 複数件 / SELECT 失敗 / 同一 memberId が複数行を持つケース（防御的に重複排除されていることを確認）。既存 `eventQueries.spec.ts` のビルダーモック方式に揃え、MSW ではなく Supabase Client モックで検証

## 5. アプリ層: Edge Function 呼び出し helper

- [x] 5.1 `apps/admin/src/shared/api/event-cancellation-notification.ts` を新規追加し、`triggerEventCancellationNotification({ eventId, eventName, startAtJst, venueName, snapshotRecipients, organizerMessage })` helper を実装する。Supabase Functions client 経由で `send-event-cancellation-notification` を呼び出す
- [x] 5.2 helper は例外を握りつぶし、失敗時は `console.warn` でログを残すだけにする（fire-and-forget 流儀）。戻り値は `Promise<void>`
- [x] 5.3 Vitest で helper の正常呼び出し / Edge Function 5xx 時の throw 抑制 / ネットワーク失敗時の throw 抑制を検証する

## 6. AlertDialog UI 拡張: 主催者メッセージ欄

- [x] 6.1 `apps/admin/src/features/event-delete/ui/EventDeleteDialog.vue` を編集し、既存の `apps/admin/src/shared/ui/Textarea.vue` を AlertDialog 内に追加する。プレースホルダは「例: 雨天のため中止します...」、`maxlength="500"`、`aria-describedby` で文字数カウンタ (`残り N 文字 / 500 文字以内`) を関連付け
- [x] 6.2 既存の「予約者には別途ご連絡ください」注意書きを「対象の予約者にはキャンセル通知メールを自動で送信します」に置き換える（有効予約あり時のみ表示）
- [x] 6.3 textarea の値は AlertDialog ローカル ref に閉じ込め、Dialog cancel / ESC では破棄する（`watch(isOpen)` で `organizerMessage` を空文字に reset）。`useEventDelete.confirm(organizerMessage)` 呼び出し時に引数で渡す

## 7. useEventDelete の confirm フロー拡張

- [x] 7.1 `apps/admin/src/features/event-delete/composables/useEventDelete.spec.ts` に以下のケースを追加: (a) 有効予約者 0 件のとき Edge Function 呼び出しが発火しない (b) 有効予約者 M 件のとき スナップショット取得 → DELETE → Edge Function 呼び出しの順で発火する (c) スナップショット取得失敗時は Edge Function 呼び出しがスキップされ DELETE / Toast / redirect は通常進行 (d) Edge Function 呼び出しが throw しても confirm() は Success 扱いで完了 (e) organizerMessage が Edge Function 引数に正しく渡る (f) organizerMessage 空白のみは payload から省く
- [x] 7.2 `apps/admin/src/features/event-delete/composables/useEventDelete.ts` の `confirm(organizerMessage?: string)` シグネチャに引数を追加し、フローを「(1) スナップショット取得 (`fetchActiveReservationRecipients` + `fetchEventCancellationMeta` を Promise.all で並列) (2) `deleteEvent(eventId)` (3) スナップショットが 1 件以上 + meta あり なら `void triggerEventCancellationNotification({...})` を try で二重防衛しつつ発火 (4) Toast (5) `/events` redirect」に拡張する。`fetchEventCancellationMeta` は venue 名取得用に新規追加 (4.1 / 4.2 の延長で eventQueries.ts に同梱)
- [x] 7.3 既存の Toast 内容（「削除しました」/「削除しました（N 件の予約も整理されました）」）と redirect / `isDeleting` / `deleteError` の挙動を変えていないことを既存テスト 11 件のグリーン継続で確認

## 8. 既存仕様との整合性確認

- [x] 8.1 `apps/admin/src/features/event-delete/index.ts` の Public API は変更不要を確認（`useEventDelete` の `confirm` シグネチャが `() => Promise<void>` → `(organizerMessage?: string) => Promise<void>` に拡張されたが optional 引数のため既存呼び出し側は影響を受けない。`UseEventDelete` インタフェースも `index.ts` 経由で型再エクスポート済）
- [x] 8.2 `openspec validate notify-event-cancellation-on-delete --strict` が `valid` を返すことを確認
- [x] 8.3 `apps/admin/src/features/event-delete/` 配下をマジックナンバー grep (`#[0-9a-f]{3,6}\b` / `rgb(` / `rgba(`) で確認: マッチは `#253` の Issue 番号参照のみで色リテラル 0 件。HQ デザイントークン使用継続

## 9. 最終確認

- [x] 9.1 `pnpm exec vitest run` を Edge Function 共有関数 (supabase/functions: 8 files / 125 tests pass) / admin スコープ (88 files / 785 tests pass) で実行し、全テストグリーンを確認
- [x] 9.2 `pnpm --filter @high-q/admin build` でアプリ層のビルドが成功することを確認 (`✓ built in 1.74s`)。`pnpm --filter @high-q/admin typecheck` も pass
- [x] 9.3 `pnpm --filter @high-q/admin lint` 相当の lint script は admin 配下に未定義 (リポジトリ全体で `pnpm -r lint` を回すが lint script を持つのは LP のみ)。代替として `pnpm --filter @high-q/admin typecheck` で TypeScript ベースの境界 / import エラー 0 件を確認済
- [ ] 9.4 dev 環境 (許可リスト宛のみ送信モード) で手動 E2E: (a) 有効予約者 1 名以上のイベントを admin で削除 → メッセージ欄入力あり → 許可リスト宛にイベント名・主催者メッセージを含むメールが届く / 件名に「イベント中止のお知らせ」が含まれる (b) メッセージ欄空欄で削除 → 本文の理由欄が描画されないメールが届く (c) 有効予約 0 件のイベントを削除 → Edge Function 呼び出しが発火していないことをログで確認 (d) 通知メール本文に予約番号 (`#HQ-`) / UUID が含まれていないことを確認 (e) Dialog のメール本文プレビューが textarea 入力に追従して更新される【dev デプロイ後に翔太郎くんと検証】
- [ ] 9.5 dev 環境で一般会員 JWT を使って `send-event-cancellation-notification` を curl で直接呼び出し、403 が返ることを確認する【dev デプロイ後に翔太郎くんと検証】

## 10. レンダラ shared 移管 (Decision 9)

- [x] 10.1 `packages/shared/src/mail-templates/event-cancellation.ts` を新規追加し、`renderEventCancellationMail` + `EventCancellationMailInput` を canonical 実装として配置する (`SIGNATURE` 定数も内部に閉じ込めて副作用ゼロの純粋関数モジュールに保つ)
- [x] 10.2 `packages/shared/src/mail-templates/index.ts` (barrel) + `packages/shared/src/index.ts` の再 export + `packages/shared/package.json` の `exports['./mail-templates']` を追加
- [x] 10.3 `supabase/functions/_shared/mailer-templates.ts` から `renderEventCancellationMail` のローカル実装を削除し、`../../../packages/shared/src/mail-templates/event-cancellation.ts` から相対パス re-export に置き換える (`supabase functions deploy` の import 追跡で `packages/shared` のファイルも bundle されることを deploy ログで実機確認済)
- [x] 10.4 Edge Function 共有テスト (`_tests/mailer-templates.spec.ts`) は import 経路変更後もそのまま 38 件 pass。文面 / 件名 / 純粋関数性の Scenario は引き続きカバー

## 11. Dialog メール本文プレビュー実装

- [x] 11.1 `useEventDelete` の `open()` で `fetchActiveReservationRecipients` + `fetchEventCancellationMeta` を `classifyEventReservations` と並列に取得し、`meta` / `recipients` を ref として公開する。`confirm()` 側はスナップショット再取得をやめ、`open()` 時の値を使い回す
- [x] 11.2 `EventDeleteDialog.vue` に `mailPreview` computed を追加し、`@high-q/shared/mail-templates` の `renderEventCancellationMail` を主催者メッセージ入力に reactive に追従して呼び続ける。`LINE_OPEN_CHAT_URL` / `PREVIEW_SUPPORT_NOTE` / `PREVIEW_RESERVATION_BASE_URL` は Edge Function 側と同期コメント付きで二重保持
- [x] 11.3 プレビューブロックを textarea 直下に描画 (件名行 + `<pre>` 本文ブロック)。`event meta` 取得失敗時 / 有効予約 0 件時はブロック非表示
- [x] 11.4 `EventDeleteDialog.spec.ts` にプレビュー描画系のケースを追加: (a) 有効予約あり時にプレビューが描画され件名にイベント名 (b) textarea 入力でプレビュー本文に主催者メッセージ欄が反映 (c) event meta 取得失敗時はプレビュー非表示で textarea は引き続き表示 (d) 有効予約 0 件時は textarea / プレビュー共に非表示 (= 既存ケースで保証)
