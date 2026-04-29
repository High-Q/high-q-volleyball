## 1. Setup（features/auth スライス雛形 + 依存追加）

- [x] 1.1 `apps/admin/src/features/auth/` ディレクトリを作成し、`composables/`、`api/`、`types.ts`、`index.ts` を空ファイルで配置する（FSD Public API 準備）
- [x] 1.2 `types.ts` に `AuthStatus`（`'idle' | 'loading' | 'authenticated' | 'unauthenticated'`）、`AuthError`、`MfaStatus`（`'idle' | 'enrolling' | 'awaiting-code' | 'verifying' | 'success' | 'error'`）、`MfaError`（`'invalid-code' | 'rate-limit' | 'network' | 'unknown'`）の型を定義
- [x] 1.3 `apps/admin/src/shared/api/` に Supabase クライアントの薄いラッパーを用意（`@high-q/shared` の `createSupabaseClient` を呼び、アプリ内 singleton として export）。既存があれば再利用判定だけ
- [x] 1.4 `apps/admin/package.json` に `qrcode`（`^1.5`）を追加し、`pnpm install` を実行。型は `@types/qrcode` を devDependencies に追加

## 2. Core: features/auth API ラッパー（TDD）

- [x] 2.1 `features/auth/api/auth-client.spec.ts` を書く: `sendMagicLink(email)` が `signInWithOtp` を `{ shouldCreateUser: false, emailRedirectTo: '<origin>/auth/callback' }` で呼ぶこと、`checkIsAdmin()` が `rpc('is_admin')` を呼ぶこと、`signOut()` が `auth.signOut()` を呼ぶこと、`getSession()` が現在の session を返すこと、`onAuthStateChange(cb)` が SDK の subscribe を返すこと、**`getAal()` が `mfa.getAuthenticatorAssuranceLevel()` を呼ぶこと**、**`listMfaFactors()` が `mfa.listFactors()` を呼ぶこと**、**`enrollTotp()` が `mfa.enroll({ factorType: 'totp' })` を呼ぶこと**、**`challengeMfa(factorId)` / `verifyMfa(factorId, challengeId, code)` が SDK 対応 API を呼ぶこと**。Supabase クライアントは `vi.mock` で差し替え
- [x] 2.2 `features/auth/api/auth-client.ts` を実装し 2.1 を pass させる

## 3. Core: useSendMagicLink composable（TDD）

- [x] 3.1 `features/auth/composables/useSendMagicLink.spec.ts` を書く: 空メールで送信時に `invalid-email` エラー、形式不正で `invalid-email`、API エラーで `unknown`、レートリミット (Supabase の `over_email_send_rate_limit` 等) で `rate-limit`、成功で `status === 'success'`、loading 状態の遷移（idle → loading → success/error）
- [x] 3.2 `features/auth/composables/useSendMagicLink.ts` を実装し 3.1 を pass させる。`status` / `error` / `submittedEmail` / `send(email)` / `reset()` を expose

## 4. Core: useAuthSession composable（TDD・AAL/MFA 対応）

- [x] 4.1 `features/auth/composables/useAuthSession.spec.ts` を書く: 初期状態で `status === 'loading'`、`getSession()` が null を返したら `unauthenticated` に遷移、session ありで `getAal()` が aal2 のとき `is_admin()` を呼んで `isAdmin = true` で `authenticated`、**aal1 のときは `is_admin()` を呼ばず `isAdmin = null` を維持**、**`listMfaFactors()` の結果で `hasMfaFactor` が更新される**、`onAuthStateChange` で session 切れたら `unauthenticated` に遷移、`signOut()` で state がクリア、`ready()` Promise が初回 getSession 解決後に resolve する
- [x] 4.2 `features/auth/composables/useAuthSession.ts` を実装。`provide/inject` キーを export し、`installAuthSession(app)` で root に provide。`useAuthSession()` で inject。`session` / `isAdmin` / `aal` / `hasMfaFactor` / `status` / `ready()` / `signOut()` / `refresh()` を expose
- [x] 4.3 `features/auth/index.ts` で `useAuthSession` / `installAuthSession` / 型を export

## 5. Core: useMfaEnrollment composable（TDD）

- [x] 5.1 `features/auth/composables/useMfaEnrollment.spec.ts` を書く: 初期マウントで `enrollTotp()` を呼び `qrCode` / `secret` / `factorId` を保持、`submitCode(code)` で `challengeMfa` → `verifyMfa` を順に呼ぶ、verify 成功で `status === 'success'`、誤コードで `error === 'invalid-code'` で再入力可、API エラーで `unknown`、状態遷移（enrolling → awaiting-code → verifying → success/error）
- [x] 5.2 `features/auth/composables/useMfaEnrollment.ts` を実装し 5.1 を pass させる。`qrCode` / `secret` / `status` / `error` / `enroll()` / `submitCode(code)` / `reset()` を expose

## 6. Core: useMfaChallenge composable（TDD）

- [x] 6.1 `features/auth/composables/useMfaChallenge.spec.ts` を書く: 初期マウントで `listMfaFactors()` → 最初の verified factor の `challengeMfa` を呼び `challengeId` 保持、`submitCode(code)` で `verifyMfa`、verify 成功で `success`、誤コードで `invalid-code`、factor が無い場合は `error === 'no-factor'`（呼び出し側で /mfa/setup へ誘導）、状態遷移（idle → awaiting-code → verifying → success/error）
- [x] 6.2 `features/auth/composables/useMfaChallenge.ts` を実装し 6.1 を pass させる。`status` / `error` / `submitCode(code)` / `reset()` を expose

## 7. Core: useIdleTimeout composable（TDD）

- [x] 7.1 `features/auth/composables/useIdleTimeout.spec.ts` を書く（fake timers 使用）: `start()` で document に `mousedown` / `keydown` / `touchstart` / `scroll` listener が登録される、いずれかのイベントで内部タイマーがリセットされる、15 分（900_000ms）経過で `signOut` callback が呼ばれる、`stop()` で listener と timer がクリアされる
- [x] 7.2 `features/auth/composables/useIdleTimeout.ts` を実装し 7.1 を pass させる。`start(onIdle)` / `stop()` を expose
- [x] 7.3 `features/auth/index.ts` で `useSendMagicLink` / `useMfaEnrollment` / `useMfaChallenge` / `useIdleTimeout` を export し、内部の `api/`・`composables/` を再 export しない

## 8. Routing: ルート定義 + auth guard（TDD・6 ケース）

- [x] 8.1 `apps/admin/src/app/router.spec.ts` （または既存のスモークテスト）に guard の **6 ケース**を追加: 未認証で `/` → `/login`、AAL1 + factor 未登録で `/` → `/mfa/setup`、AAL1 + factor 登録済みで `/` → `/mfa`、AAL2 admin で `/` → 通過、AAL2 非 admin で `/` → サインアウト + `/login?reason=not-admin`、AAL2 admin で `/login` → `/`。`useAuthSession` は `vi.mock`
- [x] 8.2 `apps/admin/src/app/router.ts` を更新: `/auth/callback` / `/mfa` / `/mfa/setup` ルート追加、`meta.public` を `/login` と `/auth/callback` に設定、`router.beforeEach` を実装し `// TODO(#84)` コメントを除去
- [x] 8.3 `apps/admin/src/main.ts` を確認し、`installAuthSession(app)` を `app.use(router)` の **前** で呼ぶように修正（router guard が inject に依存するため）。同時に `useIdleTimeout` をルートマウント直後に start し、ハンドラで `useAuthSession.signOut` を呼ぶ配線を行う

## 9. UI: AuthCallbackPage（TDD）

- [x] 9.1 `apps/admin/src/pages/AuthCallbackPage.spec.ts` を書く: マウント時に Loading 表示、AAL2 admin としてセッション確立で `/` に push、AAL1 + factor 未登録で `/mfa/setup` に push、AAL1 + factor 登録済みで `/mfa` に push、AAL2 非 admin でサインアウト + `/login?reason=not-admin`、エラーで `/login?reason=link-invalid`
- [x] 9.2 `apps/admin/src/pages/AuthCallbackPage.vue` を実装。HQ paper 背景 + 中央寄せの「サインインしています…」メッセージ、`useAuthSession` の `ready()` を await して結果に応じて router.replace

## 10. UI: LoginPage（TDD）

- [x] 10.1 `apps/admin/src/pages/LoginPage.spec.ts` を書く: Empty 状態で input + CTA 表示、CTA 押下で Loading（CTA disabled）、Success 状態（メール送信完了文言 + 「別のメールアドレスを使う」）、Error 状態（バナー文言が `reason` クエリ別に切り替わる: `not-admin` / `link-invalid` / バリデーション）、CTA 再活性、`reason` クエリは `replaceState` で URL から除去
- [x] 10.2 `apps/admin/src/pages/LoginPage.vue` を実装。デザインサンプル `ScreenLogin` を参考に、左ペイン（ブランド・コピー）/ 右ペイン（フォーム）の 2 カラムレイアウト。書体は `font-jp` / `font-jp-display` / `font-mono`、色は `bg-paper` / `bg-paper-warm` / `text-accent` / `border-hairline`、spacing は `p-hq-*` / `gap-hq-*`。shadcn-vue の `Input` / `Label` / `FormField`、`@high-q/ui` の `Button`、`Kicker` を使用
- [x] 10.3 `apps/admin/src/pages/LoginPlaceholder.vue` を削除し、router 定義を `LoginPage` に切り替える（8.2 の差分内で済む場合は本タスクをマージ可）

## 11. UI: MfaSetupPage（TDD）

- [x] 11.1 `apps/admin/src/pages/MfaSetupPage.spec.ts` を書く: マウント時に Loading（enroll 呼び出し中）、Empty=QR コード SVG / secret テキスト / 6 桁入力欄 / 推奨アプリリンク表示、CTA 押下で Loading（verify 中、入力 disabled）、Success（成功表示 → 自動 router.replace('/')）、Error（誤コードバナー + 入力欄クリア + 再入力可）
- [x] 11.2 `apps/admin/src/pages/MfaSetupPage.vue` を実装。`useMfaEnrollment` を利用。`qrcode` ライブラリで `qrCode`（otpauth URI）から SVG を生成して表示。HQ デザイントークン準拠。手順説明（"認証アプリをインストール → QR コードをスキャン → 6 桁を入力" の 3 ステップ + Authy / Google Authenticator / 1Password へのリンク）

## 12. UI: MfaChallengePage（TDD）

- [x] 12.1 `apps/admin/src/pages/MfaChallengePage.spec.ts` を書く: マウント時に Loading（factor 取得 / challenge 中）、Empty=6 桁入力欄表示、CTA 押下で Loading（verify 中）、Success（成功 → 自動 router.replace('/')）、Error（誤コードバナー + 入力欄クリア + 再入力可）、factor が無い場合は `/mfa/setup` に redirect
- [x] 12.2 `apps/admin/src/pages/MfaChallengePage.vue` を実装。`useMfaChallenge` を利用。HQ デザイントークン準拠

## 13. UI: HomePlaceholder にサインアウトボタン

- [x] 13.1 `apps/admin/src/pages/HomePlaceholder.spec.ts` に「サインアウトボタンを押すと `useAuthSession.signOut` が呼ばれ、`/login` に遷移」のテストを追加（既存テストがあれば追記）
- [x] 13.2 `apps/admin/src/pages/HomePlaceholder.vue` に最小限の「ログアウト」`Button`（variant=ghost）を右上 or 下部に追加。`// TODO(後続 dashboard Issue): サインアウトボタンを Sidebar に移設` のコメントを残す

## 14. E2E（Playwright）

E2E は本番 Supabase に通信が届かないことを **多層防御**で保証する。詳細は design.md D10.1 参照。

- [x] 14.0 **E2E 用ダミー env**: playwright.config.ts の admin webServer.env に `VITE_SUPABASE_URL=https://e2e-dummy.invalid` / `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_dummy_*` を inline で設定。さらに `PLAYWRIGHT_E2E=1` を渡し apps/admin/vite.config.ts で envDir をプロジェクトローカル (.env なし) に切り替えて .env.local 漏れを遮断。`*.invalid` は RFC 2606 予約 TLD なので DNS で解決できない（mock 漏れがあっても本番に届かない）
- [x] 14.1 `e2e/admin/_helpers/supabaseGuard.ts` に共通 fixture を作り、以下の防御を全テストに適用:
  - (i) `e2e/_global-setup.ts` で `VITE_SUPABASE_URL` を assertion し、`.supabase.co`/`.supabase.io` を含む場合は throw（本番 env 誤注入の即時検知）
  - (ii) `page.route(/\/auth\/v[0-9]+\//, ...)` `page.route(/\/rest\/v[0-9]+\//, ...)` `page.route(/\/storage\/v[0-9]+\//, ...)` で Supabase 全 API を fixture mock
  - (iii) `page.route('**/*', route => ...)` の fallback で localhost / 127.0.0.1 / *.invalid 以外は `route.abort('blockedbyclient')`（許可リスト方式）
- [x] 14.2 `e2e/admin/login.e2e.ts` に **2 件**の E2E を追加:
  - (a) `/` に未認証アクセス → `/login` にリダイレクトされ、メール入力フォームと CTA が表示される
  - (b) `/login` で有効メールを入力して CTA を押すと、Success 状態の文言が表示される（`mockSignInWithOtpSuccess(page)` で `signInWithOtp` を成功レスポンスにスタブ）
- [x] 14.3 playwright.config.ts に admin 用 project (`baseURL=http://localhost:4174`) と webServer (`pnpm --filter @high-q/admin build && vite preview --port 4174`) を追加。lp / admin で testDir を分離
- [ ] 14.4 **CI 運用ルール明記**: GitHub Actions の E2E ジョブには本番 Supabase secrets を渡さない設計を `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に追記する Sync 候補としてメモ（実装は Sync フェーズで）

## 15. 品質確認・最終チェック

- [x] 15.1 `apps/admin` 全体を grep して、オーナー email リテラル（`'owner@high-q.club'` 等）が認証判定ロジックに登場しないことを確認 → spec / placeholder のみ
- [x] 15.2 `apps/admin` 全体を grep して、`mfa.unenroll` の呼び出しが**存在しない**ことを確認 → 0 件
- [x] 15.3 マジックナンバー（`px-[56px]` 等の任意値クラス、生の hex カラー、生の `font-family`）が新規ファイルに含まれないことを確認 → 0 件
- [x] 15.4 `pnpm --filter @high-q/admin typecheck` が通る
- [x] 15.5 `pnpm --filter @high-q/admin test` が通る（unit + component test）→ 111/111
- [x] 15.6 `pnpm --filter @high-q/admin build` が通る
- [x] 15.7 Playwright E2E が通る → 5/5 (admin 2 + lp 3 既存)
- [x] 15.8 `apps/admin/src/app/router.ts` から `// TODO(#84)` コメントが除去されていることを確認 → 0 件
- [x] 15.9 ローカルで実機確認: メール送信 Success / リンク → AAL1 → /mfa/setup → QR 検証 → AAL2 admin で / 到達 / ログアウト → /login / 再ログイン → /mfa challenge → / / `?reason=not-admin` バナー。すべて翔太郎くんの実機で OK 確認済み
- [x] 15.10 idle timeout の動作確認: 15 分放置せずとも、`IDLE_LIMIT_MS` を一時的に短縮（例: 30 秒）して動作を見る方法を `useIdleTimeout.ts` のコメントに明記

## 16. ドキュメント・運用準備（Sync フェーズ向けメモ）

- [ ] 16.1 `tasks.md` 上で、Sync フェーズで反映すべき docs 候補を列挙（Apply 中はコード変更のみ、docs 更新は Sync フェーズで実施）:
  - `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md` に admin 認証フロー（マジックリンク + TOTP MFA + AAL2 + idle timeout）を追記
  - `openspec/specs/admin-auth/spec.md` を本 change の specs から生成
  - `openspec/specs/app-routing/spec.md` を MODIFIED / ADDED 反映で更新
  - Supabase Dashboard 設定の運用手順を `docs/04-システム設計/` または `docs/06-品質・セキュリティ/` に追記:
    - Redirect URLs / Magic Link 有効期限 15 分 / **JWT expiry 30 分** / **MFA TOTP を ON** / members に admin 行 1 件
    - **TOTP factor 紛失時の運用手順**（Dashboard で factor 削除 → 次回ログインで再 setup）
    - 推奨認証アプリ（Authy / Google Authenticator / 1Password）と運用上の留意点

## 17. 後続 change（本 change の範囲外、別 Issue 化推奨）

- [ ] 17.1 監査ログ（`audit_log` テーブル + RLS + identity_documents 等の主要操作ログ書き込み）の Issue を起票
- [ ] 17.2 本人確認書類閲覧時の step-up 再認証は `identity_documents` 機能 Issue で扱うことをメモ
- [ ] 17.3 IP allowlist / 異常アクセス通知は Phase 2 以降の検討事項として記録
