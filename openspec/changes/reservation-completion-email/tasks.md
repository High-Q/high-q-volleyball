## 1. 共有メーラー拡張（Edge Function 側）

- [ ] 1.1 `supabase/functions/_shared/mailer.ts` に予約完了メール用レンダラ `renderReservationConfirmedMail(input)` を追加する。入力は `{ reservationDisplayId, eventName, startAtJst, venueName, venueMapUrl, feePerPerson, guestCount, note, lineOpenChatUrl, reservationDetailUrl, supportNote }` 相当の純粋データ。出力は `{ subject, body }`。`renderSignupCodeMail` と同じ命名・export 規則
- [ ] 1.2 `supabase/functions/_shared/mailer.ts` に予約キャンセル完了メール用レンダラ `renderReservationCancelledMail(input)` を追加（入力は `{ reservationDisplayId, eventName, startAtJst, venueName, cancelledAtJst, eventDetailUrl, lineOpenChatUrl }` 相当）
- [ ] 1.3 上記 2 レンダラを `_shared` 配下のテストファイル（例: `supabase/functions/_tests/mailer-reservation.spec.ts`）でユニットテスト。同一入力で同一出力 / 連絡事項空のときの非表示 / 生 UUID 形式が本文に含まれないこと / 件名に予約番号が含まれること を MUST 検証
- [ ] 1.4 環境変数による送信抑制モードのスイッチを `_shared/mailer.ts` または共通ハンドラ層に実装する。変数名は既存命名規則に合わせ、抑制モード ON のとき `sendMail` を呼ばずに `console.log('[mailer] suppressed: ...')` を出力する
- [ ] 1.5 送信抑制モードのテストを追加（モード ON で sendMail が呼ばれないこと / モード OFF で通常送信されること）

## 2. 予約完了通知 Edge Function

- [ ] 2.1 新規 function ディレクトリを切る（例: `supabase/functions/send-reservation-notification/`）。`index.ts` / 内部ハンドラ `handleSendReservationNotification(req)` を `request-signup` の構造に倣って作成
- [ ] 2.2 リクエストペイロード `{ reservationId: string, eventType: 'confirmed' | 'cancelled' }` のバリデーションを `_shared/validation.ts` に追加（命名は既存 `validateVerifyPayload` の流儀）
- [ ] 2.3 呼び出し元の認証情報から `auth.uid()` を取得し、`reservations.member_id = auth.uid()` を Edge Function 内で SELECT 確認するガードを実装（リクエスト改ざんによる他人の reservation_id 指定を拒否）
- [ ] 2.4 reservation / event / venue / member を JOIN 取得し、レンダラへ渡す純粋データ構造に変換するユーティリティを実装
- [ ] 2.5 `eventType === 'confirmed'` のとき `renderReservationConfirmedMail` を、`'cancelled'` のとき `renderReservationCancelledMail` を呼んで `sendMail` 経由で送信
- [ ] 2.6 送信成功時のログ（種別 / reservationId / memberId）、失敗時のログ（同 + エラー内容）を `console.log` / `console.error` で出力
- [ ] 2.7 関数ハンドラのテストを追加（confirmed / cancelled の正常系 / RLS 違反相当の拒否 / SMTP 失敗時にレスポンスが 500 ではなく 200 + `{ ok: false, error: 'mail-failed' }` で返ること）

## 3. アプリ層からの呼び出し統合

- [ ] 3.1 予約確定経路（`apps/reservation/src/features/booking` 配下の reserve composable）で `reservations` INSERT / 再活性化 UPDATE 成功後に Edge Function を fire-and-forget で呼ぶ。await はしない / または await + catch でログのみ
- [ ] 3.2 キャンセル経路（`useCancelBooking`）で UPDATE 影響行数 > 0 のときに Edge Function を fire-and-forget で呼ぶ
- [ ] 3.3 Edge Function 呼び出しヘルパーを `apps/reservation/src/shared/api/` に切り出す（呼び出し元 composable が直接 fetch を書かない構成）
- [ ] 3.4 Edge Function 呼び出し失敗時の挙動が「予約成立 / キャンセル成立に影響しない」ことを composable レベルのテストで検証

## 4. 予約完了画面 UI 調整

- [ ] 4.1 `apps/reservation/src/pages/booking-done`（または該当 widget）にメール送信案内 1 行を追加。文言は「予約完了メールを <会員のメールアドレス> 宛にお送りしました。届かない場合は迷惑メールフォルダもご確認ください。」相当
- [ ] 4.2 メールアドレスは `supabase.auth.getUser()` または既存の会員情報 store から取得し、ハードコードしない
- [ ] 4.3 デザイントークン経由のスタイリングを徹底（マジックナンバー禁止）。視覚的に「薄い 1 行」になるよう本文より小さめ・補助色相当のトークンを使う
- [ ] 4.4 既存テスト（`booking-done` 関連の component test）にメール送信案内行の表示確認を追加。送信失敗を模擬したケースでも UI にエラーが出ないことを併せて検証

## 5. ドキュメント / spec 整合

- [ ] 5.1 `docs/06-品質・セキュリティ/07-ロギング方針.md` にメール送信ログの取扱いを 1 行追記（会員メールアドレスをログに残す場合の方針）
- [ ] 5.2 `docs/05-インターフェース/01-UI設計方針.md` の予約完了画面に関する記述があれば、「メール送信案内 1 行を含む」「送信失敗は UI に出さない」を追記
- [ ] 5.3 Phase 2 で Resend / 独自ドメイン移行時に差し替える箇所をコメントで明示（mailer.ts / Edge Function 内のプロバイダ抽象境界）

## 6. dev 環境動作確認

- [ ] 6.1 Supabase Edge Functions secret に既存の `GMAIL_USER` / `GMAIL_APP_PASSWORD` が dev / preview / 本番のいずれにも登録済みであることを確認（追加は不要のはず、漏れていれば翔太郎くんへ依頼）
- [ ] 6.2 dev / preview 環境用に送信抑制モード ON または許可リストを `supabase functions secrets set` で設定（翔太郎くん作業）
- [ ] 6.3 dev 環境で予約確定 → メール送信ログ確認、キャンセル → メール送信ログ確認の 2 経路をエンドツーエンドで確認
- [ ] 6.4 抑制モード OFF にした上で送信先を翔太郎くん自身の許可リストアドレスに限定し、実メール 1 通で件名 / 本文 / 文字化けの有無を視認確認

## 7. 最終検証

- [ ] 7.1 `pnpm exec vitest run` でユニット / component / Edge Function のテストが全て pass
- [ ] 7.2 `pnpm build:reservation` がエラーなく完了（型エラー / FSD 違反 / lint なし）
- [ ] 7.3 `openspec validate reservation-completion-email --strict` が pass
- [ ] 7.4 PR 作成前に翔太郎くんへローカル確認結果を提示し、承認後に PR push
