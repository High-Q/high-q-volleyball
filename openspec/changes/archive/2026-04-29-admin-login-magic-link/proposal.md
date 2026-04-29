## Why

`apps/admin` は管理者（オーナー）専用のサークル運営コンソールであり、未認証ユーザーや一般会員からアクセスされてはならない。現状は `LoginPlaceholder` のみが配置され、認証ガードもセッション管理も存在せず、URL を直叩きすればすべての管理画面にアクセスできてしまう状態である。Issue #84 はこの穴を塞ぎ、Phase 1（2026-05-08 リリース）に向けて管理画面開発の前提となる「**オーナーだけがログインできる入口**」を確立するために必要。

認証方式は **Supabase Auth マジックリンク + TOTP 二要素認証（2FA）** の組み合わせとする。本サービスは数十人規模の会員の本人確認書類（運転免許証等。マイナンバーカードはマスク済み画像）を取り扱うため、メールアカウント単独陥落で管理画面が突破される構造的弱点を回避する必要がある。マジックリンクのシンプルさを保ちつつ、TOTP（認証アプリの 6 桁コード）で第二要素を要求することで、漏えい時の被害深刻度に見合うセキュリティ水準を確保する。さらにセッション有効期限を短縮（JWT 30 分 + idle 15 分）し、デバイス紛失時の侵害ウィンドウを最小化する。

## What Changes

- **新規**: マジックリンクログインフロー（メール入力 → `signInWithOtp` 送信 → メールリンクをクリック → `/auth/callback` でセッション確立 → AAL2 確保 → `/` へリダイレクト）
- **新規**: `apps/admin` の `LoginPlaceholder` を本実装の `LoginPage` に差し替え（左ペイン: ブランド・コピー / 右ペイン: メール入力 + マジックリンク CTA）
- **新規**: `/auth/callback` ルートおよび `AuthCallbackPage`（マジックリンク戻り先）
- **新規**: **TOTP MFA Enrollment フロー** — `/mfa/setup` で QR コード表示 + 認証アプリ登録 + verify。admin で MFA factor 未登録なら強制リダイレクト（初回のみ）
- **新規**: **TOTP MFA Challenge フロー** — `/mfa` で 6 桁コード入力 + verify。AAL2（Authentication Assurance Level 2）に到達するまで管理画面アクセス不可
- **新規**: **AAL2 強制 guard** — admin ルート全体は AAL2 必須。AAL1 状態で保護ルートにアクセスすれば `/mfa` にリダイレクト
- **新規**: `auth` feature スライス（`features/auth/`）— composable `useAuthSession` / `useSendMagicLink` / `useSignOut` / `useMfaEnrollment` / `useMfaChallenge`、Supabase Auth ラッパー
- **新規**: `router.beforeEach` の **auth guard** 実装（未認証 → `/login`、AAL1 のまま保護ルート → `/mfa` または `/mfa/setup`、ログイン済みかつ非 admin → サインアウト + `/login?reason=not-admin`、ログイン済み admin がログインページへアクセス → `/`）
- **新規**: 管理者判定（`is_admin()` RPC を呼び、結果を session 内 cache）。RLS は既に `is_admin()` を提供済み。
- **新規**: **セッション短期化** — JWT 有効期限 30 分（Supabase Dashboard 設定）+ クライアント側 **idle timeout 15 分**（最後のユーザー操作から 15 分でフロント側 auto signOut）
- **新規**: ログアウト機能（`HomePlaceholder` に最小限の「ログアウト」ボタンを追加。本格的なヘッダー/サイドナビは後続 Issue で）
- **新規**: 4 状態（Loading / Empty / Error / Success）の UI 設計を Login / MFA Setup / MFA Challenge の 3 画面すべてに適用
- **修正**: `apps/admin/src/app/router.ts` の `// TODO(#84)` コメント箇所に guard を実装し、コメントを除去
- **依存追加**: TOTP の QR コード描画用ライブラリ（候補: `qrcode` ^1.5。バンドルサイズ ~30KB、型対応済み）。Supabase SDK の MFA API 自体は `@supabase/supabase-js` に内包されており追加依存なし

## Capabilities

### New Capabilities

- `admin-auth`: 管理画面（apps/admin）の認証・認可フロー全般。マジックリンク送信、セッション確立、admin ロール検証、TOTP MFA Enrollment / Challenge / AAL2 強制、idle timeout、auth guard、ログアウト、セッション復元を含む。

### Modified Capabilities

- `app-routing`: 既存の「最低 2 つのルート（Home プレースホルダ / Login プレースホルダ）」要件のうち **Login プレースホルダ要件**を本実装ルートに置換し、新たに `/auth/callback` / `/mfa` / `/mfa/setup` ルートおよび `router.beforeEach` の auth guard（AAL2 強制を含む）実装要件を追加する。`LoginPlaceholder.vue` は廃止。

## Impact

- **コード**:
  - `apps/admin/src/pages/LoginPlaceholder.vue` を `LoginPage.vue` に差し替え（または削除 + 新規）
  - `apps/admin/src/pages/AuthCallbackPage.vue` 新規
  - `apps/admin/src/pages/MfaSetupPage.vue` 新規（QR コード + verify 入力）
  - `apps/admin/src/pages/MfaChallengePage.vue` 新規（6 桁コード入力 + verify）
  - `apps/admin/src/features/auth/` 新規（composable / API ラッパー / 型 / idle timeout watcher）
  - `apps/admin/src/app/router.ts` 修正（`/auth/callback`、`/mfa`、`/mfa/setup` 追加 + `beforeEach` guard）
  - `apps/admin/src/main.ts` Supabase クライアント初期化箇所（既存 / 必要に応じて）
- **DB**: 変更なし。`is_admin()` 関数および `members.role = 'admin'` は既存仕様を利用。MFA factor は Supabase 管理（`auth.mfa_factors` テーブル、SDK 経由でのみアクセス）
- **環境変数**: `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` は既設定。追加なし
- **Supabase 側設定（運用作業、コードに含めない）**:
  - Auth → Email Templates の Magic Link テンプレートで `{{ .ConfirmationURL }}` を維持
  - Auth → URL Configuration の Site URL / Redirect URLs に admin の本番・プレビュー URL を追加
  - リンク有効期限は Supabase デフォルト 1 時間 → 15 分に短縮（要件）
  - **JWT expiry を 1800 秒（30 分）に短縮**（Auth → Sessions または Project Settings → API → JWT settings）
  - **MFA を Project レベルで有効化**（Auth → Providers → MFA → TOTP を ON）
  - オーナーアロウリスト: `members` テーブルに `role = 'admin'` 行を 1 件用意。クライアントは email ではなく `is_admin()` の結果で判定する（email は表示専用）
- **テスト**: 
  - composable のユニットテスト（`useSendMagicLink` / `useAuthSession` / `useSignOut` / `useMfaEnrollment` / `useMfaChallenge` / `useIdleTimeout`）— Supabase クライアントは MSW or vi.mock
  - router guard のユニットテスト（6 ケース: 未認証 / AAL1 で保護ルート → `/mfa` / MFA factor 未登録で `/mfa/setup` / AAL2 admin で通過 / AAL2 非 admin → サインアウト / ログイン済み AAL2 admin が /login へ → `/`）
  - LoginPage / AuthCallbackPage / MfaSetupPage / MfaChallengePage の component テスト（4 状態）
  - **E2E（Playwright）**: 機能あたり 1〜2 件（happy path: メール送信成功表示 / edge case: 未認証で / にアクセス → /login にリダイレクト）。マジックリンクの実メール受信および TOTP 検証は Supabase Auth API を MSW でモックするか E2E では skip し component test に押し下げ
- **セキュリティ**:
  - `auth.users` / `auth.mfa_factors` への直接書き込みはなし（Supabase Auth SDK 経由のみ）
  - `is_admin()` 結果のクライアントキャッシュは session スコープ（メモリ）。永続化しない
  - **AAL2 強制**: AAL1 のままでは `is_admin()` を呼ばず、保護ルートも guard で遮断
  - **idle timeout**: 最後のユーザー操作（mousedown / keydown / touchstart / scroll）から 15 分経過で `signOut`。タブ間 broadcast は MVP1 ではしない（同一ブラウザ複数タブで再ログインが必要になるが受容）
  - guard 評価中の race を避けるため、`useAuthSession` の初期化完了まで guard は `next(false)` ではなく Loading 表示
  - `/login?reason=*` の query は表示用ヒントのみ。サーバー側の判定根拠ではない
  - **TOTP のシークレット**: Supabase 側で安全に保管され、verify 後にしか admin として承認されないため、QR コードのスクリーンショット流出時の被害は最小（factor は Dashboard で削除して再 enroll 可）
- **後続 change で実施する関連改善（本 change の範囲外）**:
  - 監査ログ（`audit_log` テーブル + RLS + 主要操作ログ書き込み）→ 別 Issue
  - 本人確認書類閲覧時の step-up 再認証 → identity_documents 機能 Issue で実装
  - IP allowlist / 異常アクセス通知 → Phase 2 以降
