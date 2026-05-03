## MODIFIED Requirements

### Requirement: 最低 2 つのルート（Home プレースホルダ / Login プレースホルダ）が動作する

各アプリは、本基盤整備時点で以下の最低 2 ルートが動作しなければならない（SHALL）:

- `path: '/'` → `HomePlaceholder.vue`（"準備中" 表示）
- `path: '/login'` → **`apps/admin` および `apps/reservation` の両方で `LoginPage.vue`（マジックリンクログイン本実装）**

ルートのコンポーネント実装は HQ デザイントークン経由（Tailwind preset の utility または `@high-q/ui` プリミティブ経由）で描画される。マジックナンバー禁止。

#### Scenario: トップルートが動作する

- **WHEN** ブラウザで `/` にアクセスする
- **THEN** `HomePlaceholder.vue` が描画され、HQ paper 色背景・Zen Kaku Gothic 書体で "準備中" 表示が確認できる

#### Scenario: Login ルートが `apps/admin` で本実装される

- **WHEN** `apps/admin` でブラウザが `/login` にアクセスする
- **THEN** `LoginPage.vue` が描画され、メール入力フォームと「マジックリンクを送る」CTA が表示される（旧 `LoginPlaceholder.vue` は削除）

#### Scenario: Login ルートが `apps/reservation` で本実装される

- **WHEN** `apps/reservation` でブラウザが `/login` にアクセスする
- **THEN** `LoginPage.vue` が描画され、メール入力フォームと「ログインリンクを送る」CTA が表示される（旧 `LoginPlaceholder.vue` は削除）

## ADDED Requirements

### Requirement: `/signup/profile` ルート（apps/reservation のみ）

`apps/reservation` は会員登録の **段階 2** として `/signup/profile` を SHALL 提供する。段階 1（メール送信）は `/login` で兼用するため `/signup` 単独ルートは持たない。

- `path: '/signup/profile'` → `SignupProfilePage.vue`（氏名 / 生年月日 / 電話 / 経験レベル / 利用規約同意 → `members` UPDATE）。`meta.public` なし（auth guard により認証済み + プロフィール未完成のみアクセス可）

#### Scenario: signup-profile ルートが定義されている

- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup/profile'`、`name: 'signup-profile'`、`component: SignupProfilePage`（`meta.public` なし）が含まれる

#### Scenario: /signup ルートは存在しない

- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/signup'` の名前付きルート定義は存在しない（撤廃済み・段階 1 は `/login` で兼用）

#### Scenario: /signup/profile は認証必須

- **WHEN** 未認証ユーザーが `/signup/profile` にアクセスする
- **THEN** auth guard により `/login` にリダイレクトされる

#### Scenario: /signup/profile はプロフィール未完成のみ

- **WHEN** 認証済み + プロフィール完成済みユーザーが `/signup/profile` にアクセス
- **THEN** auth guard により `/` にリダイレクトされる

### Requirement: `/auth/callback` ルート（apps/reservation のみ）

`apps/reservation` は `path: '/auth/callback'` ルートを SHALL 持ち、`AuthCallbackPage.vue` を描画する。このページは Supabase Auth のマジックリンク戻り先として機能し、URL hash のトークンを SDK が消化した後、`isProfileComplete` 判定の結果に応じて `/`（完成済み）/ `/signup/profile`（未完成）/ `/login?reason=link-invalid`（失敗）にリダイレクトする。

#### Scenario: callback ルートが定義されている

- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/auth/callback'`、`name: 'auth-callback'`、`component: AuthCallbackPage`、`meta.public = true` が含まれる

#### Scenario: 公開ルートとして扱われる

- **WHEN** 未認証ユーザーが `/auth/callback` にアクセスする
- **THEN** auth guard でブロックされず、`AuthCallbackPage` が描画される

### Requirement: `/auth/link-sent` ルート（apps/reservation のみ）

`apps/reservation` は `path: '/auth/link-sent'` ルートを SHALL 持ち、`LinkSentPage.vue` を描画する。このページはマジックリンク送信完了画面として、送信先メールアドレス（query string `?email=<encoded>`）+ 再送ボタン + 別メールで送り直すリンクを表示する。`meta.public = true`。

#### Scenario: link-sent ルートが定義されている

- **WHEN** `apps/reservation/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/auth/link-sent'`、`name: 'auth-link-sent'`、`component: LinkSentPage`、`meta.public = true` が含まれる

#### Scenario: email クエリで送信先表示
- **WHEN** `/auth/link-sent?email=misaki%40example.com` にアクセス
- **THEN** 「misaki@example.com 宛にログインリンクを送信しました」が表示される

### Requirement: auth guard 実装（apps/reservation のみ）

`apps/reservation/src/app/router.ts` は `router.beforeEach` で auth guard を SHALL 実装する。`admin-reservation-ui-foundation` change で残された `// TODO: auth guard をここに追加（reservation の会員認証）` コメントは本 change で除去される MUST。

guard は以下の判定を行う:

1. `useAuthSession.ready()` を await し、Supabase session の初期復元と member 取得を待つ
2. `to.meta.public === true` のルート（`/login` / `/auth/callback` / `/auth/link-sent`）は **未認証でも通過**。ただし認証済み + プロフィール完成済みが `/login` にアクセスした場合は `/` にリダイレクト（`/auth/callback` / `/auth/link-sent` は除外）。`/` 自体は public ではない（2026-05-04 ランディング廃止）
3. 非公開ルートは未認証なら `/login` にリダイレクト
4. 認証済み + プロフィール未完成（`isProfileComplete === false`）で `/signup/profile` 以外のルートにアクセスした場合 → `/signup/profile` にリダイレクト（`/auth/callback` は除外: callback 内でリダイレクト判定するため）
5. 認証済み + プロフィール完成済みが `/signup/profile` にアクセスしたら `/` にリダイレクト
6. それ以外（認証済み + プロフィール完成 + 任意ルート）は通過

#### Scenario: 未認証で `/` にアクセス（ランディング廃止により認証必須）

- **WHEN** 未認証ユーザーが `/` にアクセス
- **THEN** auth guard により `/login` にリダイレクトされる（`/` は `meta.public` を持たない）

#### Scenario: 未認証で保護ルートにアクセス（将来）

- **WHEN** 未認証ユーザーが `meta.public` 未設定のルートにアクセス
- **THEN** `/login` にリダイレクトされる

#### Scenario: 認証済み + プロフィール未完成で `/` にアクセス

- **WHEN** 認証済み + `isProfileComplete === false` のユーザーが `/` にアクセス
- **THEN** `/signup/profile` にリダイレクトされる（情報入力強制）

#### Scenario: 認証済み + プロフィール未完成で `/signup/profile` にアクセス

- **WHEN** 認証済み + `isProfileComplete === false` のユーザーが `/signup/profile` にアクセス
- **THEN** `SignupProfilePage` が描画される（無限ループしない）


#### Scenario: 認証済み + プロフィール完成済みで `/login` にアクセス

- **WHEN** プロフィール完成済みのユーザーが `/login` にアクセス
- **THEN** `/` にリダイレクトされる

#### Scenario: 認証済み + プロフィール完成済みで `/signup` にアクセス

- **WHEN** プロフィール完成済みのユーザーが `/signup` にアクセス
- **THEN** `/` にリダイレクトされる

#### Scenario: 認証済み + プロフィール完成済みで保護ルート（将来）にアクセス

- **WHEN** プロフィール完成済みのユーザーが `meta.public` 未設定のルート（将来の予約ルート等）にアクセス
- **THEN** そのまま該当ページが描画される

### Requirement: ルーティングのスモークテスト（apps/reservation の更新）

`apps/reservation` のルーティングスモークテストは、`/signup` / `/auth/callback` / `/auth/link-sent` の 3 ルート追加と auth guard の存在を SHALL 検証する。`/login` がプレースホルダではなく `LoginPage` であることを検証する。

#### Scenario: 新ルート定義の検証
- **WHEN** `apps/reservation/src/app/router.spec.ts` を実行
- **THEN** `/signup` / `/auth/callback` / `/auth/link-sent` の 3 ルートが定義されているテストが pass する

#### Scenario: LoginPage 描画の検証
- **WHEN** スモークテストで `/login` にナビゲートする
- **THEN** `LoginPage` がマウントされる（旧 `LoginPlaceholder` ではない）
