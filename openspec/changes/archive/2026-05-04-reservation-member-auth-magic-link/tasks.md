## 1. Setup（ブランチ + features/auth + entities/member スライス雛形）

- [x] 1.1 ブランチ作成: `git checkout -b feature/89-reservation-member-auth-magic-link`
- [x] 1.2 `apps/reservation/src/features/auth/` ディレクトリを作成し、`composables/`、`api/`、`types.ts`、`index.ts` を空ファイルで配置（FSD Public API 準備）
- [x] 1.3 `apps/reservation/src/entities/member/` ディレクトリを作成し、`model/`、`api/`、`index.ts` を空ファイルで配置
- [x] 1.4 `apps/reservation/src/shared/api/` を作成し、`supabase.ts`（admin と同じパターン: `@high-q/shared` の `createSupabaseClient` を singleton ラップ + `_resetSupabaseForTest()` を export）
- [x] 1.5 `features/auth/types.ts` に型定義: `AuthStatus`（`'loading' | 'authenticated' | 'unauthenticated'`）、`AuthError`（`'invalid-email' | 'rate-limit' | 'network' | 'unknown'`）、`SignupPayload`（`{ display_name: string; email: string; birthday: string; phone: string; experience_level: ExperienceLevel; terms_agreed_at: string; expires_at: number }` — phone は必須・正規化済み）
- [x] 1.6 `entities/member/model/member.types.ts` に Branded Types を定義: `MemberId`（Brand<string, 'MemberId'>）、`ExperienceLevel`（`'beginner' | 'intermediate' | 'experienced'`）、`Member` インタフェース（id / email / displayName / birthday / phone / experienceLevel / role / profile / createdAt / updatedAt）、`MemberRow`（DB raw snake_case 型）

## 2. Domain Layer: Smart constructors（TDD）

- [x] 2.1 `entities/member/model/MemberId.spec.ts` を書く: 空文字でエラー / 非 UUID 形式でエラー / 正常な UUID で `MemberId` を返す
- [x] 2.2 `entities/member/model/MemberId.ts` を実装: `createMemberId(value: string): MemberId`
- [x] 2.3 `entities/member/model/displayName.spec.ts` を書く: 空文字でエラー / 51 文字以上でエラー / 1〜50 文字で正常 / 前後空白は trim
- [x] 2.4 `entities/member/model/displayName.ts` を実装: `createDisplayName(value: string): string`
- [x] 2.5 `entities/member/model/birthday.spec.ts` を書く: 未来日でエラー / 100 年超過でエラー / 不正な ISO 形式でエラー / 過去 100 年以内の日付で正常
- [x] 2.6 `entities/member/model/birthday.ts` を実装: `createBirthday(value: string): string`（ISO 8601 date 形式）
- [x] 2.7 `entities/member/model/phone.spec.ts` を書く（**必須項目**）: 空文字でエラー / null でエラー / 固定電話（`03-XXXX-XXXX`）でエラー / 桁数不足でエラー / 携帯番号 `090-1234-5678` / `09012345678` / `０９０-１２３４-５６７８`（全角） / `+819012345678`（国際表記）はすべて `'090-1234-5678'` に正規化、`070` / `080` / `090` で始まる携帯番号で正常
- [x] 2.8 `entities/member/model/phone.ts` を実装: `createPhone(value: string): string`（必須・正規化付き。返り値は常に `^0[789]0-\d{4}-\d{4}$` 形式）
- [x] 2.9 `entities/member/model/experienceLevel.spec.ts` を書く: enum 外でエラー / `'beginner' | 'intermediate' | 'experienced'` で正常
- [x] 2.10 `entities/member/model/experienceLevel.ts` を実装: `createExperienceLevel(value: string): ExperienceLevel`
- [x] 2.11 `entities/member/model/index.ts` で全 Smart constructor + 型を re-export
- [x] 2.12 `entities/member/index.ts` で Public API（型 + Smart constructor）を export

## 3. Core: features/auth API ラッパー（TDD）

- [x] 3.1 `features/auth/api/auth-client.spec.ts` を書く: `sendMagicLink(email, { shouldCreateUser })` が `signInWithOtp` を `{ email, options: { shouldCreateUser, emailRedirectTo: '<origin>/auth/callback' } }` で呼ぶこと（login: false / signup: true の 2 ケース）、`signOut()` が `auth.signOut()` を呼ぶこと、`getSession()` が現在の session を返すこと、`onAuthStateChange(cb)` が SDK の subscribe を返すこと。Supabase クライアントは `vi.mock` で差し替え
- [x] 3.2 `features/auth/api/auth-client.ts` を実装し 3.1 を pass させる

## 4. Core: entities/member API（TDD）

- [x] 4.1 `entities/member/api/member-client.spec.ts` を書く: `fetchMyMember()` が `from('members').select('*').eq('id', auth.uid()).single()` を呼び `MemberRow → Member` 変換を返すこと、行が無い場合 null を返すこと、エラー時に Result<Member, error> 型でエラーを返すこと、`updateMyMember(payload)` が **更新前 SELECT で現在の `profile` を取得 → JS でマージ（既存キー保持 + `signup_completed: true` + `terms_agreed_at`）→ `from('members').update(...).eq('id', auth.uid())`** の順で呼ばれること、profile マージで他キーが保持されること
- [x] 4.2 `entities/member/api/member-client.ts` を実装し 4.1 を pass させる
- [x] 4.3 `entities/member/model/isProfileComplete.spec.ts` を書く: `member?.profile?.signup_completed === true` のときのみ true、`profile = {}` で false、`profile.signup_completed = false` で false、`profile = null` / `member = null` で false
- [x] 4.4 `entities/member/model/isProfileComplete.ts` を実装: `isProfileComplete(member: Member | null): boolean`

## 5. Core: useSendMagicLink composable（TDD）

- [x] 5.1 `features/auth/composables/useSendMagicLink.spec.ts` を書く: 空メールで送信時に `invalid-email` エラー、形式不正で `invalid-email`、API エラーで `unknown`、レートリミット（Supabase の `over_email_send_rate_limit`）で `rate-limit`、成功で `status === 'success'`、loading 状態の遷移（idle → loading → success/error）、`shouldCreateUser` パラメータが渡される（login モード / signup モード）
- [x] 5.2 `features/auth/composables/useSendMagicLink.ts` を実装し 5.1 を pass させる。`status` / `error` / `submittedEmail` / `send(email, { shouldCreateUser })` / `reset()` を expose

## 6. Core: useSignUp composable（TDD）

- [x] 6.1 `features/auth/composables/useSignUp.spec.ts` を書く: `submit(formData)` で全フィールドを Smart constructor 経由でバリデーション、利用規約同意 false で `validation` エラー、`localStorage[signup-pending-<email>]` に payload + `expires_at = now() + 24h` を保存、`useSendMagicLink.send(email, { shouldCreateUser: true })` を呼ぶ、API 失敗時に payload は **削除しない**（再 submit で上書き可）、API 成功で `status === 'success'`
- [x] 6.2 `features/auth/composables/useSignUp.ts` を実装し 6.1 を pass させる

## 7. Core: useAuthSession composable（TDD）

- [x] 7.1 `features/auth/composables/useAuthSession.spec.ts` を書く: 初期状態で `status === 'loading'`、`getSession()` が null を返したら `unauthenticated` に遷移、session ありで `fetchMyMember()` を呼んで `member` を格納し `authenticated` に遷移、`isProfileComplete = computed(() => isProfileCompleteFn(member.value))`（= `member?.profile?.signup_completed === true`）、`onAuthStateChange` で session 切れたら `unauthenticated` に遷移、`signOut()` で state がクリア（session / member / isProfileComplete = false）、`ready()` Promise が初回 getSession + member fetch 解決後に resolve、`refresh()` で再 fetch
- [x] 7.2 `features/auth/composables/useAuthSession.ts` を実装し 7.1 を pass させる。`provide/inject` キーを export し、`installAuthSession(app)` で root に provide。`useAuthSession()` で inject。`session` / `member` / `status` / `isProfileComplete` / `ready()` / `refresh()` / `signOut()` を expose
- [x] 7.3 `features/auth/index.ts` で `useAuthSession` / `installAuthSession` / `useSendMagicLink` / `useSignUp` / 型を export し、内部の `api/`・`composables/` を再 export しない

## 8. Routing: ルート定義 + auth guard（TDD・5 ケース）

- [x] 8.1 `apps/reservation/src/app/router.spec.ts` （または既存スモークテスト）に guard の **5 ケース** + 公開ルート確認を追加: 未認証 + `/`（public） → 通過 / 未認証 + `/secret-protected` → `/login` / 認証済み + `profile.signup_completed != true` + `/` → `/signup` / 認証済み + `profile.signup_completed != true` + `/signup` → 通過 / 認証済み + `profile.signup_completed = true` + `/login` → `/` / 認証済み + `profile.signup_completed = true` + `/signup` → `/`。`useAuthSession` は `vi.mock`
- [x] 8.2 `apps/reservation/src/app/router.ts` を更新: `/signup` / `/auth/callback` / `/auth/link-sent` ルート追加、`meta.public` を `/` / `/login` / `/signup` / `/auth/callback` / `/auth/link-sent` に設定、`router.beforeEach` を実装し `// TODO: auth guard をここに追加（reservation の会員認証）` コメントを除去
- [x] 8.3 `apps/reservation/src/main.ts` を確認し、`installAuthSession(app)` を `app.use(router)` の **前** で呼ぶように修正（router guard が inject に依存するため）

## 9. UI: AuthCallbackPage（TDD）

- [x] 9.1 `apps/reservation/src/pages/AuthCallbackPage.spec.ts` を書く: マウント時に Loading 表示、session 確立 + payload あり + 期限内 + UPDATE 成功で payload 削除 + `/` に push、payload あり + 期限切れで payload 削除 + プロフィール判定（完成 → `/` / 未完成 → `/signup`）、payload なし + プロフィール完成で `/`、payload なし + プロフィール未完成で `/signup`、session 失敗で `/login?reason=link-invalid`、payload UPDATE 失敗で payload 保持 + `/signup?reason=profile-update-failed`
- [x] 9.2 `apps/reservation/src/pages/AuthCallbackPage.vue` を実装。HQ paper 背景 + 中央寄せの「サインインしています…」メッセージ、`useAuthSession` の `ready()` を await して結果に応じて `router.replace`。payload 適用は `entities/member/api` の `updateMyMember` を使用

## 10. UI: LoginPage（TDD）

- [x] 10.1 `apps/reservation/src/pages/LoginPage.spec.ts` を書く: Empty 状態で input + CTA 表示、CTA 押下で Loading（CTA disabled）、Success 状態で `/auth/link-sent?email=<encoded>` に遷移、Error 状態（バナー文言が `reason` クエリ別に切り替わる: `link-invalid` / バリデーション）、CTA 再活性、`reason` クエリは `replaceState` で URL から除去、「会員登録はこちら」リンクで `/signup` へ
- [x] 10.2 `apps/reservation/src/pages/LoginPage.vue` を実装。デザインサンプル `docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx` の **`ScreenRLogin` (L791-845)** を参考に、**1 カラム + モバイルファースト**（max-width で中央寄せ、390px 基準）。書体は `font-jp` / `font-jp-display` / `font-mono`、色は `bg-paper` / `text-accent` / `border-hairline`、spacing は `p-hq-*` / `gap-hq-*`。shadcn-vue の `Input` / `Label` / `FormField`、`@high-q/ui` の `Button` / `Kicker` を使用。CTA 文言は **「ログインリンクを送る」**、「会員登録へ進む」リンク（カード型）と「ゲストとしてイベントを見る」フッターリンクをサンプル通り配置
- [x] 10.3 `apps/reservation/src/pages/LoginPlaceholder.vue` を削除し、router 定義を `LoginPage` に切り替える（8.2 の差分内で済む場合は本タスクをマージ可）

## 11. UI: SignupPage（TDD）

- [x] 11.1 `apps/reservation/src/pages/SignupPage.spec.ts` を書く: Empty 状態で全フィールド + 同意チェックボックス + CTA disabled、同意 ON で CTA 活性、必須未入力で各フィールドにバリデーションエラー、生年月日が未来日でエラー、生年月日が 100 年前超過でエラー、**電話番号空でエラー（「電話番号を入力してください（当日連絡用）」）**、**電話番号が固定電話でエラー（「携帯電話番号を入力してください」）**、CTA 押下で Loading（入力欄活性 / CTA disabled）、Success 状態で `/auth/link-sent?email=<encoded>` に遷移、Error 状態で バナー + 入力値保持 + CTA 再活性
- [x] 11.2 `apps/reservation/src/pages/SignupPage.vue` を実装。デザインサンプル `docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx` の **`ScreenRSignup` (L911-984)** を参考に、**1 カラム + モバイルファースト**。電話番号フィールドは **必須マーク表示 + ヒント「当日連絡用 / 携帯電話番号」**（サンプルの「任意 · 当日連絡用」ラベルから変更）。経験レベルはラジオカード（初めて / 中級 / 経験者）でサンプル通りのデザイン。利用規約同意は inline テキスト + チェックボックス（リンクは `<RouterLink>` で配線、本文未確定なら `#` 暫定）。フッター固定 CTA「**登録してリンクを送る**」。`useSignUp` を利用

## 12. UI: LinkSentPage（TDD）

- [x] 12.1 `apps/reservation/src/pages/LinkSentPage.spec.ts` を書く: query string `?email=<encoded>` から送信先表示、再送ボタン押下で `useSendMagicLink.send` 再実行、Loading 状態（再送中はボタン disabled）、Success 状態で「再送しました」表示、Error 状態（rate-limit で「約 60 秒お待ちください」/ network で再試行誘導）、「別のメールアドレスで送り直す」リンクで `/login` または `/signup` に戻る（query で判定: `?via=login` / `?via=signup`）
- [x] 12.2 `apps/reservation/src/pages/LinkSentPage.vue` を実装。デザインサンプル `docs/10-デザインサンプル/reservation/hq-reserve-screens.jsx` の **`ScreenRLinkSent` (L850-906)** を参考に、accent-soft 背景の円アイコン（メール SVG）+ 「メールを送信しました。」見出し + 送信先メール強調表示 + 注意事項リスト 3 件（リンク有効期限 15 分 / 迷惑メール / 別メール可）+ 「**メールを再送する**」「**別のアドレスを使う**」リンク（サンプル通りの文言）

## 13. UI: HomePlaceholder にログアウトボタン

- [x] 13.1 `apps/reservation/src/pages/HomePlaceholder.spec.ts` に「ログアウトボタンを押すと `useAuthSession.signOut` が呼ばれ、`/login` に遷移する（認証済みの場合のみ表示）」のテストを追加（既存テストがあれば追記）
- [x] 13.2 `apps/reservation/src/pages/HomePlaceholder.vue` を修正: 認証済み（`status === 'authenticated'`）かつ プロフィール完成済みの場合のみ「ログアウト」`Button`（variant=ghost）を表示。`// TODO(後続 dashboard / nav Issue): ログアウトボタンを Sidebar / Header に移設` のコメントを残す

## 14. E2E（Playwright）

E2E は admin と同じく **本番 Supabase に通信が届かないことを多層防御**で保証する。admin E2E setup（`e2e/admin/_helpers/supabaseGuard.ts` 等）を踏襲。

- [x] 14.0 **E2E 用ダミー env**: playwright.config.ts の reservation webServer.env に `VITE_SUPABASE_URL=https://e2e-dummy.invalid` / `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_dummy_*` を inline で設定。`PLAYWRIGHT_E2E=1` で envDir を切替（admin と同じ仕組みを reservation 用に複製）
- [x] 14.1 `e2e/reservation/_helpers/supabaseGuard.ts` を作成（admin の helper を参考にコピー&リネーム）。`page.route` で Supabase API 全 mock + 許可リスト方式で localhost / *.invalid 以外を `route.abort('blockedbyclient')`
- [x] 14.2 `e2e/reservation/auth.e2e.ts` に **2 件**の E2E を追加:
  - (a) `/login` で有効メール入力 + CTA → `/auth/link-sent` に遷移し送信先メールが表示される（`mockSignInWithOtpSuccess(page)` で stub）
  - (b) `/signup` でフォーム未入力で CTA を押そうとすると CTA disabled、利用規約同意 OFF でも disabled、全部入力 + 同意 ON で送信成功 → `/auth/link-sent` に遷移
- [x] 14.3 playwright.config.ts に reservation 用 project (`baseURL=http://localhost:4175`) と webServer (`pnpm --filter @high-q/reservation build && vite preview --port 4175`) を追加

## 15. 品質確認・最終チェック

- [x] 15.1 `apps/reservation` 全体を grep して、オーナー email リテラル（`'owner@high-q.club'` 等）が認証判定ロジックに登場しないことを確認
- [x] 15.2 マジックナンバー（`px-[56px]` 等の任意値クラス、生の hex カラー、生の `font-family`）が新規ファイルに含まれないことを確認
- [x] 15.3 PII（email / 氏名 / 電話 / 生年月日）が `console.log` / 構造化ログに含まれないことを grep で確認
- [x] 15.4 `pnpm --filter @high-q/reservation typecheck` が通る
- [x] 15.5 `pnpm --filter @high-q/reservation test` が通る（unit + component test）
- [x] 15.6 `pnpm --filter @high-q/reservation build` が通る
- [x] 15.7 Playwright E2E が通る（admin + lp + reservation）
- [x] 15.8 `apps/reservation/src/app/router.ts` から `// TODO: auth guard をここに追加（reservation の会員認証）` コメントが除去されていることを確認
- [ ] 15.9 ローカルで実機確認（モバイルビューポート 390px） — **翔太郎くん実機 OK 待ち**:
  - signup フォーム入力 → リンク送信 → メール → callback → プロフィール作成完了 → `/` 到達
  - logout → `/login` → 同じメールで login → `/` 到達（プロフィール再入力不要）
  - 期限切れリンク → `/login?reason=link-invalid` バナー表示 → 再送
  - 利用規約同意 OFF で CTA disabled
  - 必須フィールド未入力でバリデーションエラー
  - 翔太郎くんの実機で OK 確認

## 16. ドキュメント・運用準備（Sync フェーズ向けメモ）

- [ ] 16.1 Sync フェーズで反映すべき docs 候補を tasks.md 上で列挙（Apply 中はコード変更のみ、docs 更新は Sync フェーズで実施）:
  - `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md` に reservation 会員認証フロー（マジックリンク / プロフィール完成判定 / ゲスト閲覧）を追記
  - `openspec/specs/reservation-member-auth/spec.md` を本 change の specs から生成
  - `openspec/specs/app-routing/spec.md` を MODIFIED / ADDED 反映で更新
  - Supabase Dashboard 設定の運用手順を追記:
    - Redirect URLs に reservation の本番・プレビュー URL（`https://high-q-reservation.onrender.com/auth/callback` 等）を追加
    - reservation 用の Email Template は admin と共通利用（カスタマイズ不要）

## 17. 後続 change（本 change の範囲外、別 Issue 化推奨）

- [ ] 17.1 イベント一覧の本実装（#90 で起票済みであれば確認、未起票なら起票）
- [ ] 17.2 予約フォーム / 予約確認 / 予約完了（#91）
- [ ] 17.3 予約履歴 / プロフィール編集（#92 / #148）
- [ ] 17.4 利用規約・プライバシーポリシー本文の作成 + 同意 UI から本文へのリンク配線
- [ ] 17.5 **本人確認書類アップロード（identity_documents）を予約確定時に必須化** — 電話番号申告制の弱点を補完する身元担保。既存 `identity_documents` テーブル + RLS を利用。Issue 起票推奨（design.md D12 参照）
- [ ] 17.6 **未確認 / 中途離脱ユーザーの 48h cleanup ジョブ（並行起票・Phase 1 内リリース推奨）** — Supabase Edge Function + cron-job.org 等の外部 cron で日次 SQL 実行。判定 SQL は design.md D3.1 参照。本 change の `signup_completed` フラグを判定根拠に利用
- [ ] 17.7 **「ゼロ滞留」signup フロー（Option F）→ Phase 2** — Edge Function + admin SDK + 6 桁コード方式で「全項目入力 + コード検証 → 一括 INSERT」を実装。中途半端な行が DB に一切残らない設計
- [ ] 17.8 Phase 2: SMS 認証（Twilio / AWS SNS + Supabase Phone Auth）、WebAuthn / Passkey 強化、idle timeout、通知設定、統計
