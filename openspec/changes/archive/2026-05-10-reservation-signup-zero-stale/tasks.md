## 1. DB マイグレーション（signup_pending テーブル + RLS）

- [x] 1.1 `signup_pending` テーブル migration 作成（列: `email text PRIMARY KEY`、`payload jsonb NOT NULL`、`code_hash text NOT NULL`、`attempt_count int NOT NULL DEFAULT 0 CHECK >= 0`、`expires_at timestamptz NOT NULL`、`created_at timestamptz NOT NULL DEFAULT now()`、`updated_at timestamptz NOT NULL DEFAULT now()`）
- [x] 1.2 `signup_pending` に `set_updated_at()` トリガを適用
- [x] 1.3 `signup_pending` の RLS 有効化 + service_role 限定ポリシー（SELECT / INSERT / UPDATE / DELETE すべて service_role のみ）
- [x] 1.4 `expires_at` に btree インデックスを追加（期限切れ行スキャン用、ベストエフォート掃除に使用）
- [x] 1.5 dev DB に migration 適用（同時に service_role GRANT 補正 migration `20260511000100_grant_service_role.sql` も適用済み）+ Edge Function 経由で動作確認済み（`request-signup` 成功 → メール受信 → `verify-signup` で `auth.users` + `members` 作成）

## 2. Edge Function `request-signup` 実装（コード発行）

- [x] 2.1 Edge Function プロジェクト構造を Supabase CLI で雛形作成（`supabase/functions/request-signup/`）
- [x] 2.2 入力 payload zod スキーマ定義（メール / 氏名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意 ISO8601）
- [x] 2.3 既存 `auth.users` での同 email 重複チェック実装（admin SDK の `listUsers` ではなく `members` を email で SELECT して 0 行確認）
- [x] 2.4 6 桁コード生成（暗号論的乱数）+ ハッシュ化（SHA-256）ユーティリティ実装
- [x] 2.5 `signup_pending` に UPSERT（同 email 行を上書き）
- [x] 2.6 認証コードメール送信実装（Gmail SMTP 経由、`denomailer` で `smtp.gmail.com:465` SMTPS、件名・本文の最終文言は 2.10 で確定）
- [x] 2.7 レスポンス整形（success / already-registered / validation-error / rate-limited）
- [x] 2.8 同一 email からの短時間連続送信レートリミット実装（具体値: 60 秒以内の再送は 429 を返す）
- [x] 2.9 Edge Function 単体テスト: `_shared/validation.ts` / `_shared/code.ts` を Vitest 化（新規 workspace package `@high-q/edge-functions`）。validation 25 件 + code 9 件 pass。Function entry の HTTP ハンドラは Deno 依存のため Playwright E2E + 手動 dev 検証でカバー
- [x] 2.10 メールテンプレート文言確定（件名「【High Q】会員登録の認証コード」/ 本文に 6 桁コード + 30 分有効の旨 + 心当たりがない場合の案内）

## 3. Edge Function `verify-signup` 実装（コード検証 + 一括作成）

- [x] 3.1 Edge Function 雛形作成（`supabase/functions/verify-signup/`）
- [x] 3.2 入力 payload zod スキーマ定義（email + 6 桁コード）
- [x] 3.3 `signup_pending` 行 SELECT + 期限チェック + コードハッシュ照合
- [x] 3.4 試行回数インクリメント実装 + 上限到達時の行削除（具体値: 5 回失敗で削除）
- [x] 3.5 期限切れ行の即削除実装
- [x] 3.6 `supabase.auth.admin.createUser({ email, email_confirm: true })` 呼び出し
- [x] 3.7 同 Function 内で `members` UPSERT（payload の正式値 + `profile.signup_completed = true` + `profile.terms_agreed_at`）
- [x] 3.8 `signup_pending` 該当行の DELETE
- [x] 3.9 期限切れ行のベストエフォート掃除（自分の処理ついでに `expires_at < now() - interval '1 hour'` を DELETE）
- [x] 3.10 セッション発行: `supabase.auth.admin.generateLink({ type: 'magiclink' })` で `hashed_token` を取得しクライアントへ返却。クライアントは `supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })` で session を確立する
- [x] 3.11 レスポンス整形（success + tokenHash / invalid-code / expired / attempt-exceeded / not-found）
- [x] 3.12 Edge Function 検証ロジックの単体テスト: `verifyCode` / `validateVerifyPayload` を Vitest 化（同上 workspace）。誤コード / 期限切れ / 試行回数上限のフローは composable spec + Playwright E2E でもカバー
- [x] 3.13 dev 環境の実 Supabase + 実 Edge Function で手動統合テスト済み（翔太郎くんとレム共同 2026-05-11）。`request-signup` → メール受信 → `verify-signup` で `auth.users` + `members` 一括作成が成立することを確認。Docker ベースの `supabase functions serve` ローカル統合は後続 Issue（Deno test infra と合わせて）

## 4. reservation アプリ `/signup` ページ実装

- [x] 4.1 既存 `LoginPage` のフォーム構造を参考に `apps/reservation/src/pages/SignupPage.vue` を新規作成
- [x] 4.2 全フィールド入力欄（メール / 氏名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意 / PolicyFooter）を実装
- [x] 4.3 既存 `entities/member` の Smart constructor（生年月日 / 電話番号 / 経験レベル / ニックネーム）をクライアント側バリデーションに流用
- [x] 4.4 features/auth に `useRequestSignupCode` composable を新設（Edge Function `request-signup` を呼ぶ）
- [x] 4.5 4 状態 UI 実装（Empty / Loading / Error / Success）
- [x] 4.6 既登録エラー時の「[ログインへ]」リンク表示
- [x] 4.7 component test（Vitest + Vue Test Utils）で 4 状態をカバー
- [x] 4.8 `apps/reservation/src/app/router.ts` に `/signup` ルート追加（component: SignupPage、`meta.public = true`）

## 5. reservation アプリ `/signup/verify` ページ実装

- [x] 5.1 `apps/reservation/src/pages/SignupVerifyPage.vue` 新規作成
- [x] 5.2 6 桁コード入力欄（数字のみ・autofocus・1 文字ずつ split UI）+ 認証 CTA + 再送リンク + メール変更リンクを実装
- [x] 5.3 features/auth に `useVerifySignupCode` composable を新設（Edge Function `verify-signup` を呼ぶ）+ 検証成功で session を `supabase.auth.setSession` で保持
- [x] 5.4 4 状態 UI 実装（Empty / Loading / Error / Success）
- [x] 5.5 期限切れ / 上限到達のエラー表示 + `/signup` への戻り CTA
- [x] 5.6 「メールアドレスを変更する」リンクは `/signup` に戻り、フォーム内容を保持する仕組み（pinia or props or sessionStorage で hold）
- [x] 5.7 クエリパラメータ email なしで直接アクセスされたら `/signup` にリダイレクト
- [x] 5.8 component test で 4 状態 + 各エラー分岐をカバー
- [x] 5.9 `router.ts` に `/signup/verify` ルート追加（`meta.public = true`）

## 6. ルート整理 + auth guard 簡素化

- [x] 6.1 `apps/reservation/src/pages/SignupProfilePage.vue` を削除
- [x] 6.2 `router.ts` から `/signup/profile` ルート定義を削除
- [x] 6.3 auth guard から「プロフィール未完成 → `/signup/profile` 強制誘導」分岐を削除
- [x] 6.4 「認証済み + `/login` or `/signup` or `/signup/verify` → `/`」分岐を実装
- [x] 6.5 HomePlaceholder 等の「会員登録」CTA リンク先を `/signup/profile` から `/signup` に変更（grep で全箇所修正）
- [x] 6.6 `/login` ページの「未登録メール」エラー表示で「[新規会員登録へ]」リンクを `/signup` に向ける
- [x] 6.7 `LinkSentPage` のテキストを「ログインリンクを送信しました」に統一（signup 用文言を削除）
- [x] 6.8 `AuthCallbackPage` から `isProfileComplete === false` 分岐を削除（到達不能のため）

## 7. テスト整備

- [x] 7.1 features/auth composable のユニットテスト（`useRequestSignupCode` / `useVerifySignupCode`）— Edge Function 呼び出しを `vi.mock`
- [x] 7.2 router guard のユニットテスト（5 ケース: 未認証 + `/` → 通過（public）/ 未認証 + 保護ルート → `/login` / 認証済み + `/signup` → `/` / 認証済み + `/login` → `/` / 認証済み + 保護ルート → 通過）
- [x] 7.3 SignupPage / SignupVerifyPage の component テスト（4 状態網羅）
- [x] 7.4 既存 LoginPage component テストの「未登録メール」シナリオを `/signup` リンクへの遷移に更新
- [x] 7.5 Playwright E2E ハッピーパス追加（`/signup` で全項目入力 → コードメール送信成功表示 → `/signup/verify` で 6 桁コード入力 → `/signup/identity` 遷移までを Supabase Auth API モック経由でカバー）
- [x] 7.6 Playwright E2E edge case 追加（誤コード入力で Error 表示）
- [x] 7.7 既存の `/signup/profile` 関連 E2E / component テストを削除または `/signup` に書き換え

## 8. Phase 1 滞留行のワンショット清掃

- [x] 8.1 dev DB で滞留行件数を SELECT して翔太郎くんに件数提示（`profile.signup_completed != 'true'` AND `role != 'admin'` の条件）
- [x] 8.2 翔太郎くんの確認後、dev DB で DELETE 実行（`auth.users` を起点 + ON DELETE CASCADE で `members` 連動）
- [x] 8.3 prd 適用前に dev で再 SELECT して残件 0 を確認 + admin 行が残ることを確認
- [x] 8.4 prd 適用時の手順を `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に追記（実行は本 change のリリース直後 1 回のみ）

## 9. ドキュメント更新

- [x] 9.1 `docs/03-アーキテクチャ/03-インフラ・CICD構成.md` に Edge Function `request-signup` / `verify-signup` のデプロイ手順 + Gmail アプリパスワード発行手順 + Edge Function secret 設定手順を追記
- [x] 9.2 `docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md` に `signup_pending` の RLS 設計を追記
- [x] 9.3 `docs/05-インターフェース/01-UI設計方針.md` の「会員登録フロー」セクションを 1 ページ全項目入力 + コード検証の構成に書き換え
- [x] 9.4 (取り下げ済) Issue #190 のコメントに「本 change で根本解決のため Close 候補」を投稿し翔太郎くんに判断を仰ぐ

## 10. 最終確認

- [x] 10.1 `pnpm exec vitest run` が全アプリ pass
- [x] 10.2 `pnpm --filter @high-q/reservation build` が成功
- [x] 10.3 `pnpm --filter @high-q/reservation test:e2e` の signup 関連が全 pass
- [x] 10.4 dev 環境で実 Supabase + 実 Edge Function を使った手動 E2E（happy path / 誤コード / 期限切れ / 既登録）を翔太郎くんと一緒に確認
- [x] 10.5 `openspec validate reservation-signup-zero-stale --strict` が pass
