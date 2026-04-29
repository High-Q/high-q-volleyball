## MODIFIED Requirements

### Requirement: 最低 2 つのルート（Home プレースホルダ / Login プレースホルダ）が動作する

各アプリは、本基盤整備時点で以下の最低 2 ルートが動作しなければならない（SHALL）:

- `path: '/'` → `HomePlaceholder.vue`（"準備中" 表示）
- `path: '/login'` → **`apps/admin` では `LoginPage.vue`（マジックリンクログイン本実装）**、`apps/reservation` では `LoginPlaceholder.vue`（後続 Issue で実装される枠）

ルートのコンポーネント実装は HQ デザイントークン経由（Tailwind preset の utility または `@high-q/ui` プリミティブ経由）で描画される。マジックナンバー禁止。

#### Scenario: トップルートが動作する

- **WHEN** ブラウザで `/` にアクセスする
- **THEN** `HomePlaceholder.vue` が描画され、HQ paper 色背景・Zen Kaku Gothic 書体で "準備中" 表示が確認できる

#### Scenario: Login ルートが `apps/admin` で本実装される

- **WHEN** `apps/admin` でブラウザが `/login` にアクセスする
- **THEN** `LoginPage.vue` が描画され、メール入力フォームと「マジックリンクを送る」CTA が表示される（旧 `LoginPlaceholder.vue` は削除）

#### Scenario: Login ルートが `apps/reservation` ではプレースホルダのまま

- **WHEN** `apps/reservation` でブラウザが `/login` にアクセスする
- **THEN** `LoginPlaceholder.vue` が描画される（後続 Issue で本実装される）

## ADDED Requirements

### Requirement: `/auth/callback` ルート（apps/admin のみ）

`apps/admin` は `path: '/auth/callback'` ルートを SHALL 持ち、`AuthCallbackPage.vue` を描画する。このページは Supabase Auth のマジックリンク戻り先として機能し、URL hash のトークンを SDK が消化した後、AAL / MFA factor 状態に応じて `/`（AAL2 admin）/ `/mfa`（AAL1 + factor 登録済み）/ `/mfa/setup`（AAL1 + factor 未登録）/ `/login?reason=*`（失敗）にリダイレクトする。

#### Scenario: callback ルートが定義されている

- **WHEN** `apps/admin/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/auth/callback'`、`name: 'auth-callback'`、`component: AuthCallbackPage` が含まれる

#### Scenario: 公開ルートとして扱われる

- **WHEN** 未認証ユーザーが `/auth/callback` にアクセスする
- **THEN** auth guard でブロックされず、`AuthCallbackPage` が描画される（meta.public = true）

### Requirement: `/mfa` および `/mfa/setup` ルート（apps/admin のみ）

`apps/admin` は MFA challenge 用の `path: '/mfa'`（`MfaChallengePage.vue`）と MFA enrollment 用の `path: '/mfa/setup'`（`MfaSetupPage.vue`）を SHALL 持つ。両ルートは AAL1 認証済みユーザーのみが到達できる中間ルートであり、AAL2 到達時は guard により `/` にリダイレクト MUST される。

#### Scenario: MFA ルートが定義されている

- **WHEN** `apps/admin/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/mfa'`（name: 'mfa', component: MfaChallengePage）と `path: '/mfa/setup'`（name: 'mfa-setup', component: MfaSetupPage）の 2 ルートが含まれる

#### Scenario: 未認証ユーザーが MFA ルートにアクセス

- **WHEN** 未認証ユーザーが `/mfa` または `/mfa/setup` にアクセス
- **THEN** `/login` にリダイレクトされる

#### Scenario: AAL2 admin が MFA ルートにアクセス

- **WHEN** AAL2 + admin のユーザーが `/mfa` または `/mfa/setup` にアクセス
- **THEN** `/` にリダイレクトされる

### Requirement: auth guard 実装（apps/admin のみ）

`apps/admin/src/app/router.ts` は `router.beforeEach` で auth guard を SHALL 実装する。`admin-reservation-ui-foundation` change で残された `// TODO(#84): auth guard をここに追加` コメントは本 change で除去される MUST。

guard は以下の判定を行う:

1. `useAuthSession.ready()` を await し、Supabase session の初期復元を待つ
2. `to.meta.public === true` のルート（`/login` / `/auth/callback`）は通過。ただしログイン済み AAL2 admin が `/login` にアクセスした場合は `/` にリダイレクト（`/auth/callback` は除外）
3. 非公開ルートは未認証なら `/login` にリダイレクト
4. AAL1 状態の場合、`/mfa` / `/mfa/setup` 自体へのアクセスは通過。それ以外の保護ルートは `hasMfaFactor` の真偽に応じて `/mfa` または `/mfa/setup` にリダイレクト
5. AAL2 で非 admin なら `signOut` 後 `/login?reason=not-admin` にリダイレクト
6. AAL2 admin が `/mfa` または `/mfa/setup` にアクセスしたら `/` にリダイレクト
7. それ以外（AAL2 admin が保護ルートへ）は通過

#### Scenario: 未認証で保護ルートにアクセス

- **WHEN** 未認証ユーザーが `/`（meta.public 未設定）にアクセス
- **THEN** `/login` にリダイレクトされる

#### Scenario: AAL1 + factor 未登録で保護ルートにアクセス

- **WHEN** AAL1 + factor 未登録のユーザーが `/` にアクセス
- **THEN** `/mfa/setup` にリダイレクトされる

#### Scenario: AAL1 + factor 登録済みで保護ルートにアクセス

- **WHEN** AAL1 + factor 登録済みのユーザーが `/` にアクセス
- **THEN** `/mfa` にリダイレクトされる

#### Scenario: AAL2 admin で保護ルートにアクセス

- **WHEN** AAL2 + admin のユーザーが `/` にアクセス
- **THEN** そのまま `HomePlaceholder` が描画される

#### Scenario: AAL2 で非 admin の場合

- **WHEN** AAL2 + 非 admin のユーザーが `/` にアクセス
- **THEN** 自動サインアウトされ、`/login?reason=not-admin` にリダイレクトされる

#### Scenario: ログイン済み AAL2 admin が /login にアクセス

- **WHEN** AAL2 + admin のユーザーが `/login` にアクセス
- **THEN** `/` にリダイレクトされる

#### Scenario: ログイン済み admin が /auth/callback にアクセス

- **WHEN** admin としてログイン済みのユーザーが（マジックリンク再クリック等で）`/auth/callback` にアクセス
- **THEN** guard では通過する（callback ページ内のロジックで AAL / factor 状態に応じてリダイレクトされる）

### Requirement: ルーティングのスモークテスト拡張

`apps/admin` のルーティングテストは、`/auth/callback` / `/mfa` / `/mfa/setup` ルートが定義され、auth guard が公開ルート/保護ルート/MFA 中間ルートを正しく振り分けることを SHALL 検証する。

#### Scenario: 全ルート定義のテスト

- **WHEN** `pnpm --filter @high-q/admin test` を実行する
- **THEN** `routes` 配列に `/`、`/login`、`/auth/callback`、`/mfa`、`/mfa/setup` の 5 ルートが含まれることを検証するテストが pass する

#### Scenario: guard 6 ケースのテスト

- **WHEN** guard の単体テストを実行する
- **THEN** 以下の 6 ケースが pass する: 「未認証で / → /login」「AAL1 + factor 未登録で / → /mfa/setup」「AAL1 + factor 登録済みで / → /mfa」「AAL2 admin で / → 通過」「AAL2 非 admin で / → サインアウト + /login?reason=not-admin」「AAL2 admin で /login → /」
