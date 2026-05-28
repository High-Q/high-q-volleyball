## 1. 事前調査

- [x] 1.1 `supabase/functions/send-reservation-notification/index.ts` の handler 全体構造を再読し、本 Edge Function でも踏襲する pattern (auth ヘッダ抽出 / `validateXxxPayload` / `createServiceClient` / `getUser` / `member_id` 検証 / `loadMailEnv` + `sendMail` / `captureException`) を確認する
- [x] 1.2 `supabase/functions/_shared/validation.ts` の既存 validator 命名規則を読み、`validateIdentityDocumentPendingNotificationPayload` を追加する位置を決める
  - 結論: 既存 `validateReservationNotificationPayload` 直下に追加。`UUID_RE` を流用
- [x] 1.3 `supabase/functions/_shared/mailer-templates.ts` の既存レンダラ群を読み、`renderIdentityDocumentPendingNotificationMail` を追加する位置を決める
  - 結論: ファイル末尾に追加。既存と同様 `Input` 型 + 純粋関数の 2 セット
- [x] 1.4 `apps/reservation/src/shared/api/reservation-notification.ts` を読み、本変更で追加する `triggerIdentityDocumentPendingNotification` の API 形を `triggerReservationNotification` と揃える
  - 結論: 戻り値 `Promise<void>` / `getSupabase` + `auth.getSession` + `functions.invoke` の同形構造

## 2. 純粋レンダラ (TDD)

- [x] 2.1 `supabase/functions/_tests/mailer-templates.spec.ts` に `renderIdentityDocumentPendingNotificationMail` のテスト 9 ケースを追加 (subject 固定 / display_name 含有 / JST 日時 / detailUrl 含有 / 個人情報非露出 / 純粋関数 / UTC 深夜帯翌日換算 / UUID 単独非露出 / ISO 生表示非含有)
- [x] 2.2 `supabase/functions/_shared/mailer-templates.ts` に `renderIdentityDocumentPendingNotificationMail` + `IdentityDocumentPendingNotificationInput` 型 + `formatUploadedAtJst` helper を実装。9/9 緑

## 3. payload validator (TDD)

- [x] 3.1 `_tests/validation-identity-document-pending-notification.spec.ts` を新規作成 (6 ケース: 正常系 / UUID 形式違反 / 空文字 / 欠落 / 非 object / trim)
- [x] 3.2 `_shared/validation.ts` に `validateIdentityDocumentPendingNotificationPayload` + `IdentityDocumentPendingNotificationPayload` 型を追加。6/6 緑

## 4. Edge Function ハンドラ

- [x] 4.1 `supabase/functions/send-identity-document-pending-notification/index.ts` を新規作成し、`handleSendIdentityDocumentPendingNotification(req)` を `send-reservation-notification` と同形で実装:
  - preflight / method=POST チェック
  - Authorization ヘッダから JWT 抽出 (なければ 401)
  - payload JSON parse + `validateIdentityDocumentPendingNotificationPayload` (失敗で 400)
  - `createServiceClient()` + `supabase.auth.getUser(token)` で `auth.uid()` 確定
  - `select id, member_id, uploaded_at, member:members(display_name) from identity_documents where id = :id` を service_role で 1 クエリ取得
  - 行が存在しない → 200 + `{ ok: false, error: 'not-found' }`
  - `member_id !== auth.uid()` → 403 + `{ error: 'forbidden' }`
  - `OWNER_NOTIFICATION_EMAIL` env 未設定 → 200 + `{ ok: false, error: 'no-owner-email' }` + 構造化ログ
  - `ADMIN_BASE_URL` env を取得 (未設定時は本番既定値 `https://high-q-admin.onrender.com` にフォールバック)
  - `renderIdentityDocumentPendingNotificationMail({...})` で文面生成、build/render 失敗 → 200 + `{ ok: false, error: 'build-failed' }` + Sentry
  - `loadMailEnv()` + `sendMail(env, ownerEmail, subject, body)` で送信
  - 成功 → 200 + `{ ok: true }` + 構造化ログ (memberId / identityDocumentId / 種別)
  - SMTP 失敗 → 200 + `{ ok: false, error: 'mail-failed' }` + Sentry
- [x] 4.2 `Deno.serve(handleSendIdentityDocumentPendingNotification)` でエントリポイント export

## 5. Edge Function ハンドラ テスト (方針変更により skip)

- [x] 5.1 vitest 範囲外と判断。理由: `supabase/functions/vitest.config.ts` は `_tests/**/*.spec.ts` のみを対象とし、Edge Function 本体 (`Deno.serve` / `npm:nodemailer` を直 import) は node ランナーで実行不可。既存 `send-reservation-notification` 本体にも vitest テストは無く、本変更も同じ方針に従う
- [x] 5.2 ハンドラの正しさは ① `_shared` 層 (validator + renderer) の vitest 網羅 (Section 2 + 3)、② `send-reservation-notification` と同形コードの構造的一貫性、③ dev 実送信観測 (Section 9.5) で担保する

## 6. 会員サイト側 trigger composable (TDD)

- [x] 6.1 `apps/reservation/src/shared/api/identity-document-notification.spec.ts` を新規作成 (5 ケース: happy path / セッション欠落 / invoke error / invoke throw / { ok: false } warn)
- [x] 6.2 シナリオ網羅完了 (上記 5 ケース)
- [x] 6.3 `apps/reservation/src/shared/api/identity-document-notification.ts` に `triggerIdentityDocumentPendingNotification(identityDocumentId)` を `triggerReservationNotification` と同形で実装。5/5 緑

## 7. useUploadIdentityDocument への組み込み (TDD)

- [x] 7.1 `useUploadIdentityDocument.spec.ts` に新シナリオ 7 ケース追加 (happy path 表面のみ / happy path 表裏 / storage_failed_front / storage_failed_back / db_failed 最終 UPDATE / db_failed INSERT / trigger 内部失敗が submit 成功を覆さない)
- [x] 7.2 `useUploadIdentityDocument.ts` の `submit()` 末尾 (succeeded=true 直後、return 直前) に `void triggerIdentityDocumentPendingNotification(docId)` を追加。32/32 緑

## 8. 環境変数 / secret 整備 (記述のみ。実 secret 投入は翔太郎くん作業)

- [x] 8.1 `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` の Edge Function Secrets 表に `OWNER_NOTIFICATION_EMAIL` / `ADMIN_BASE_URL` を追記。ついでに既存 `RESERVATION_BASE_URL` / `MAIL_SUPPRESS_SEND` / `MAIL_ALLOWED_RECIPIENTS` も表に正式記載 (mailer.ts / mailer-policy.ts に既に存在するが表に未掲載だった漏れ補修)
- [x] 8.2 dev / preview / 本番の推奨値を表内にすべて列挙。完了報告で翔太郎くんへの secret 投入依頼を実施する (下記「翔太郎くん作業依頼」セクション参照)

### 翔太郎くん作業依頼 (Apply 完了報告で改めて案内)

| secret | dev 環境値 | preview 環境値 | 本番環境値 |
|---|---|---|---|
| `OWNER_NOTIFICATION_EMAIL` | `high.q.volleyball@gmail.com` | (本番と同じ) | `high.q.volleyball@gmail.com` |
| `ADMIN_BASE_URL` | dev admin URL | preview admin URL (任意) | `https://high-q-admin.onrender.com` |

設定先: Supabase Dashboard → Edge Functions → Secrets。dev / 本番それぞれの Supabase Project で個別に投入する。

## 9. 統合確認

- [x] 9.1 `pnpm --filter @high-q/reservation test` 緑 (729 / 729)
- [x] 9.2 `pnpm --filter @high-q/reservation typecheck` 緑
- [x] 9.3 Edge Function ローカルテスト: `cd supabase/functions && pnpm test` 緑 (143 / 143)
- [x] 9.4 `pnpm -r build` 全パッケージ成功 (admin / reservation / lp / shared / design-tokens / tailwind-preset / ui 等)
- [ ] 9.5 dev Supabase で実送信確認 (翔太郎くん作業、PR Preview / merge 後に実施)
- [ ] 9.6 dev 環境設定を元に戻す (翔太郎くん作業、9.5 直後)
