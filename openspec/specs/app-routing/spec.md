# app-routing Specification

## Purpose
TBD - created by archiving change admin-reservation-ui-foundation. Update Purpose after archive.
## Requirements
### Requirement: admin / reservation アプリに Vue Router が導入される

`apps/admin` および `apps/reservation` は、`vue-router` を `dependencies` に持ち、`createRouter` ベースのルーティング基盤で動作しなければならない（SHALL）。`history` mode は `createWebHistory()` を採用する。

#### Scenario: vue-router が依存として宣言されている

- **WHEN** `apps/admin/package.json` および `apps/reservation/package.json` の `dependencies` を確認する
- **THEN** `vue-router` が宣言されている

#### Scenario: アプリ起動時に router がマウントされる

- **WHEN** `apps/admin` または `apps/reservation` を起動して、トップ URL（`/`）にアクセスする
- **THEN** `<RouterView />` 配下にルートに対応するコンポーネントが描画される

### Requirement: ルート定義は `src/app/router.ts` に集約される

各アプリのルート定義は、`apps/<app>/src/app/router.ts` に単一ファイルとして集約しなければならない（SHALL）。`main.ts` から `import router from './app/router'` で参照し、`createApp(App).use(router).mount('#app')` の形で配線する。

#### Scenario: ルート定義ファイルが規定の場所にある

- **WHEN** `apps/admin/src/app/router.ts` および `apps/reservation/src/app/router.ts` を確認する
- **THEN** `createRouter` を呼び出し、`routes` 配列を export する単一ファイルが存在する

### Requirement: 最低 2 つのルート（Home プレースホルダ / Login プレースホルダ）が動作する

各アプリは、本基盤整備時点で以下の最低 2 ルートが動作しなければならない（SHALL）:

- ホーム URL (`path: '/'`) の到達先:
  - `apps/admin`: イベント一覧画面へリダイレクト（既存）
  - `apps/reservation`: **イベント一覧画面へリダイレクト**（#90 で導入。従来の「準備中」プレースホルダは廃止 MUST）
  - `apps/lp`: ランディングページ（既存）
- ログイン URL (`path: '/login'`): `apps/admin` および `apps/reservation` の両方でログイン画面（マジックリンクログイン本実装）

ルートのコンポーネント実装は HQ デザイントークン経由（Tailwind preset の utility または `@high-q/ui` プリミティブ経由）で描画される。マジックナンバー禁止。

#### Scenario: トップルートが LP で動作する
- **WHEN** `apps/lp` でブラウザで `/` にアクセスする
- **THEN** LP の本体ページが描画される

#### Scenario: 会員サイトのトップがイベント一覧へリダイレクトされる
- **WHEN** プロフィール完成済みユーザーが会員サイトのホーム URL にアクセスする
- **THEN** イベント一覧画面に到達する

#### Scenario: 「準備中」プレースホルダが会員サイトから廃止されている
- **WHEN** 会員サイトの画面群を確認
- **THEN** 「準備中」プレースホルダ画面は存在しない

#### Scenario: ログイン画面が apps/admin で本実装されている
- **WHEN** `apps/admin` でブラウザがログイン URL にアクセスする
- **THEN** ログイン画面が描画され、メール入力フォームと「マジックリンクを送る」CTA が表示される

#### Scenario: ログイン画面が apps/reservation で本実装されている
- **WHEN** `apps/reservation` でブラウザがログイン URL にアクセスする
- **THEN** ログイン画面が描画され、メール入力フォームと「ログインリンクを送る」CTA が表示される

### Requirement: navigation guard 拡張点が用意されている

各アプリの `src/app/router.ts` は、後続の認証（#84）で `router.beforeEach` を追加するための拡張点をコメントで明示しなければならない（SHALL）。本 change では guard 自体は実装しないが、追加箇所が明確である。

#### Scenario: guard 追加点がドキュメントされている

- **WHEN** `apps/admin/src/app/router.ts` を確認する
- **THEN** `router.beforeEach` 用の挿入ポイントを示すコメント（例: `// TODO(#84): auth guard をここに追加`）が含まれる

### Requirement: ルーティングのスモークテストが存在する

各アプリは、`vue-router` のルーティングが動作することを検証する**最低 1 件のスモークテスト**を持たなければならない（SHALL）。テストは Vitest + `@vue/test-utils` で `/` および `/login` への遷移を確認する。

#### Scenario: ルーティングテストが pass する

- **WHEN** `pnpm --filter @high-q/admin test` および `pnpm --filter @high-q/reservation test` を実行する
- **THEN** `/` で `HomePlaceholder` がマウントされ、`/login` で `LoginPlaceholder` がマウントされるテストが pass する

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

### Requirement: `/events` ルート（apps/admin のみ）

`apps/admin` は `path: '/events'` ルートを SHALL 持ち、`EventsListPage.vue` を描画する。本ルートは admin 認証下のルートであり、既存の auth guard により AAL2 + admin role を満たすユーザーのみアクセス可能で、未認証 / AAL1 / 非 admin の各ケースで `/login` / `/mfa` / `/mfa/setup` / `/login?reason=not-admin` に redirect される。

#### Scenario: events ルートが定義されている

- **WHEN** `apps/admin/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/events'`、`name: 'events'`、`component: EventsListPage` が含まれる

#### Scenario: 未認証アクセスは /login に redirect される

- **WHEN** 未認証ユーザーが `/events` にアクセス
- **THEN** auth guard により `/login` に redirect される

#### Scenario: 認証済 admin はそのまま描画

- **WHEN** AAL2 + admin role のユーザーが `/events` にアクセス
- **THEN** `EventsListPage.vue` が描画される

### Requirement: `/events/new` ルート予約（apps/admin のみ）

`apps/admin` は `path: '/events/new'` ルートを SHALL 予約する。Issue #85 ではプレースホルダコンポーネント（"準備中"）を表示し、実体（イベント編集フォーム）は #86 で実装される。本ルートも admin 認証下のルート。

#### Scenario: events/new ルートが定義されている

- **WHEN** `apps/admin/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/events/new'` のルートエントリが存在する

### Requirement: ルート `/` から `/events` への redirect（apps/admin のみ）

`apps/admin` のトップルート `/` は、`redirect: { name: 'events' }` を SHALL 持つ。これにより認証済 admin は自動的に実機能（イベント一覧）に到達し、未認証なら `/events` 経由で auth guard により `/login` に到達する。`HomePlaceholder.vue` を `/` に紐付ける旧仕様（admin-reservation-ui-foundation 由来）は本変更で置き換えられる。

#### Scenario: 認証済 admin の / アクセス

- **WHEN** AAL2 + admin role のユーザーが `/` にアクセス
- **THEN** auth guard 通過後、router が `/events` に redirect する

#### Scenario: 未認証の / アクセス

- **WHEN** 未認証ユーザーが `/` にアクセス
- **THEN** `/` → `/events` の redirect 後、auth guard により `/login` に到達する

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

`apps/reservation` は `path: '/auth/link-sent'` ルートを SHALL 持ち、`LinkSentPage.vue` を描画する。このページはマジックリンク送信完了画面として、送信先メールアドレス（query string `?email=<encoded>`）+ 再送ボタン + 別アドレスを使うリンクを表示する。`meta.public = true`。

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
2. `to.meta.public === true` のルート（`/login` / `/auth/callback` / `/auth/link-sent`）は **未認証でも通過**。ただし認証済み + プロフィール完成済みが `/login` にアクセスした場合は `/` にリダイレクト（`/auth/callback` / `/auth/link-sent` は除外）。`/` 自体は public ではない（ランディング廃止）
3. 非公開ルートは未認証なら `/login` にリダイレクトする。このとき、元の遷移先（`to.fullPath`）を **同一 origin のパスとして安全と判定できる場合に限り** `next` クエリに付与して `/login?next=<encoded>` の形でリダイレクトする SHALL。元が `/login` 自身および `/auth/*` 系の場合は付与しない MUST NOT
4. 認証済み + プロフィール未完成（`isProfileComplete === false`）で `/signup/profile` 以外のルートにアクセスした場合 → `/signup/profile` にリダイレクト（`/auth/callback` は除外: callback 内でリダイレクト判定するため）
5. 認証済み + プロフィール完成済みが `/signup/profile` にアクセスしたら `/` にリダイレクト
6. それ以外（認証済み + プロフィール完成 + 任意ルート）は通過

guard は遷移先 URL の検証に共通 open redirect ガード関数 (`shared/lib/safeNextPath`) を MUST 用いる。検証に失敗した値はクエリから落とす MUST。

#### Scenario: 未認証で `/` にアクセス（ランディング廃止により認証必須）

- **WHEN** 未認証ユーザーが `/` にアクセス
- **THEN** auth guard により `/login` にリダイレクトされる（`/` は `meta.public` を持たない）。`/` は安全と判定されるため `next=/` がクエリに付与される

#### Scenario: 未認証で保護ルートにアクセス（将来）

- **WHEN** 未認証ユーザーが `meta.public` 未設定のルートにアクセス
- **THEN** `/login?next=<encoded-original-path>` にリダイレクトされる

#### Scenario: 未認証で `/events/:id` にアクセス（LP 経由の主要動線）

- **WHEN** 未認証ユーザーが `/events/<id>` にアクセス
- **THEN** `/login?next=%2Fevents%2F<id>` にリダイレクトされる

#### Scenario: 未認証で `/login` 自身にアクセス

- **WHEN** 未認証ユーザーが `/login` に直接アクセス
- **THEN** そのまま `/login` が描画される（自己参照の `next` は付与されない）

#### Scenario: 未認証で `/auth/callback` にアクセス

- **WHEN** 未認証ユーザーが `/auth/callback` に直接アクセス
- **THEN** auth guard でブロックされず、`AuthCallbackPage` が描画される（meta.public により通過、`next` 付与の対象外）

#### Scenario: 認証済み + プロフィール未完成で `/` にアクセス

- **WHEN** 認証済み + `isProfileComplete === false` のユーザーが `/` にアクセス
- **THEN** `/signup/profile` にリダイレクトされる（情報入力強制）

#### Scenario: 認証済み + プロフィール未完成で `/signup/profile` にアクセス

- **WHEN** 認証済み + `isProfileComplete === false` のユーザーが `/signup/profile` にアクセス
- **THEN** `SignupProfilePage` が描画される（無限ループしない）

#### Scenario: 認証済み + プロフィール完成済みで `/login` にアクセス

- **WHEN** プロフィール完成済みのユーザーが `/login` にアクセス
- **THEN** `/` にリダイレクトされる

#### Scenario: 認証済み + プロフィール完成済みで `/signup/profile` にアクセス

- **WHEN** プロフィール完成済みのユーザーが `/signup/profile` にアクセス
- **THEN** `/` にリダイレクトされる

#### Scenario: 認証済み + プロフィール完成済みで保護ルート（将来）にアクセス

- **WHEN** プロフィール完成済みのユーザーが `meta.public` 未設定のルート（将来の予約ルート等）にアクセス
- **THEN** そのまま該当ページが描画される

#### Scenario: 不正な next 値は無視される

- **WHEN** 何らかの理由で `next` クエリに同一 origin のパス以外（絶対 URL / 別 origin / プロトコル文字列等）が含まれた状態で guard が起動する
- **THEN** guard は `next` を無視し、認証成功後の navigate 先として既定値（`/` 相当）を採用する

### Requirement: ルーティングのスモークテスト（apps/reservation の更新）

`apps/reservation` のルーティングスモークテストは、本 capability で追加されるイベント一覧・イベント詳細の 2 ルートと、ホーム URL からイベント一覧へのリダイレクトを SHALL 検証する。既存ルート (`/signup/profile` / `/auth/callback` / `/auth/link-sent`) の存続も SHALL 検証する。`/login` がプレースホルダではなく `LoginPage` であることを検証する。

#### Scenario: 新ルート定義の検証
- **WHEN** `apps/reservation/src/app/router.spec.ts` を実行
- **THEN** `/events` / `/events/:id` / `/signup/profile` / `/auth/callback` / `/auth/link-sent` の各ルートが定義されているテストが pass する

#### Scenario: LoginPage 描画の検証
- **WHEN** スモークテストで `/login` にナビゲートする
- **THEN** `LoginPage` がマウントされる（旧 `LoginPlaceholder` ではない）

#### Scenario: トップルートのリダイレクト検証
- **WHEN** スモークテストでホーム URL にナビゲートする
- **THEN** イベント一覧画面 (`/events`) へリダイレクトされる

### Requirement: イベント一覧ルート（apps/reservation のみ）

会員サイトはイベント一覧画面を提供するルートを SHALL 持つ。本ルートは認証ガード配下に置かれ MUST、未認証ユーザーはログイン画面へ、プロフィール未完成ユーザーはプロフィール入力画面へリダイレクトされる。

#### Scenario: ルートの定義
- **WHEN** 会員サイトのルーティング設定を確認
- **THEN** イベント一覧画面に対応するルート (`/events` / name `events-list`) が定義されている

#### Scenario: 未認証ユーザーのアクセス
- **WHEN** 未認証ユーザーがイベント一覧ルートにアクセス
- **THEN** ログイン画面へリダイレクトされる

#### Scenario: プロフィール未完成ユーザーのアクセス
- **WHEN** プロフィール未完成ユーザーがイベント一覧ルートにアクセス
- **THEN** プロフィール入力画面へリダイレクトされる

#### Scenario: 正常系
- **WHEN** プロフィール完成済みユーザーがイベント一覧ルートにアクセス
- **THEN** イベント一覧画面が描画される

### Requirement: イベント詳細ルート（apps/reservation のみ）

会員サイトはイベント詳細画面を提供するルートを SHALL 持つ。URL パラメータでイベント識別子を受け取り、認証ガード配下に置かれる MUST。

#### Scenario: ルートの定義
- **WHEN** 会員サイトのルーティング設定を確認
- **THEN** イベント識別子をパラメータに取る詳細画面ルート (`/events/:id` / name `event-detail`) が定義されている

#### Scenario: 正常系
- **WHEN** プロフィール完成済みユーザーが任意のイベント識別子で詳細ルートにアクセス
- **THEN** イベント詳細画面が描画され、当該イベント情報の取得が開始される

### Requirement: open redirect 防止ヘルパ `safeNextPath`

`apps/reservation/src/shared/lib/safeNextPath.ts` に open redirect 攻撃を防ぐパス検証ヘルパを SHALL 配置する。本ヘルパは guard / auth 系画面の各所から共通参照され、`next` クエリ値を信頼可能なパスに正規化または却下する責務を持つ MUST。

判定ルール:

1. 値が `string` でない場合は却下 (`null` を返す)
2. 値が `/` で始まらない場合は却下 (相対パス / 絶対 URL を含む)
3. 値が `//` で始まる場合は却下 (protocol-relative URL を防ぐ)
4. 値に改行・タブ・制御文字を含む場合は却下
5. デコード後の値が `/login` / `/login/...` / `/auth/...` / `/signup` / `/signup/...` で始まる場合は却下 (認証導線への循環を防ぐ)
6. 上記すべてを通過した値はそのまま返す

#### Scenario: 同一 origin の通常パスを受理

- **WHEN** `safeNextPath('/events/abc-123')` を呼ぶ
- **THEN** `'/events/abc-123'` がそのまま返る

#### Scenario: 絶対 URL を却下

- **WHEN** `safeNextPath('https://evil.example.com/phish')` を呼ぶ
- **THEN** `null` が返る

#### Scenario: protocol-relative URL を却下

- **WHEN** `safeNextPath('//evil.example.com')` を呼ぶ
- **THEN** `null` が返る

#### Scenario: 認証導線への循環を却下

- **WHEN** `safeNextPath('/login?reason=x')` または `safeNextPath('/signup/verify')` を呼ぶ
- **THEN** いずれも `null` が返る（既定値での navigate にフォールバックさせるため）

#### Scenario: 非文字列入力を却下

- **WHEN** `safeNextPath(undefined)` / `safeNextPath(['/events'])` 等を呼ぶ
- **THEN** `null` が返る

### Requirement: `/members` ルート（apps/admin のみ）

`apps/admin` は `path: '/members'` ルートを SHALL 持ち、`MembersListPage.vue` を描画する。本ルートは admin 認証下のルートであり、既存の auth guard により AAL2 + admin role を満たすユーザーのみアクセス可能で、未認証 / AAL1 / 非 admin の各ケースで `/login` / `/mfa` / `/mfa/setup` / `/login?reason=not-admin` に redirect される。

詳細 sheet の表示は URL クエリ `?detail=:id` で同期 SHALL する。フィルタ・検索・ソート・ページネーションも同一画面の URL クエリで同期される（`admin-members-list` capability に従う）。

#### Scenario: members ルートが定義されている
- **WHEN** `apps/admin/src/app/router.ts` の `routes` 配列を確認する
- **THEN** `path: '/members'`、`name: 'members'`、`component: MembersListPage` が含まれる

#### Scenario: 未認証アクセスは /login に redirect される
- **WHEN** 未認証ユーザーが `/members` にアクセス
- **THEN** auth guard により `/login` に redirect される

#### Scenario: AAL1 ユーザーは /mfa に redirect される
- **WHEN** AAL1 ユーザーが `/members` にアクセス
- **THEN** auth guard により `/mfa` または `/mfa/setup` に redirect される（factor 登録有無による）

#### Scenario: 非 admin は /login?reason=not-admin に redirect される
- **WHEN** AAL2 + 非 admin ユーザーが `/members` にアクセス
- **THEN** auth guard により `signOut` 後 `/login?reason=not-admin` に redirect される

#### Scenario: 認証済 admin はそのまま描画
- **WHEN** AAL2 + admin role のユーザーが `/members` にアクセス
- **THEN** `MembersListPage.vue` が描画される

#### Scenario: 詳細 sheet 同期
- **WHEN** AAL2 + admin が `/members?detail=<uuid>` を直接開く
- **THEN** ページが描画され、当該会員の詳細 sheet が初期状態で開く

