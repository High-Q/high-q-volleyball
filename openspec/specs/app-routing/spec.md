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

- `path: '/'` → `HomePlaceholder.vue`（"準備中" 表示）
- `path: '/login'` → `LoginPlaceholder.vue`（後続 #84 で実装される Login 画面の枠）

ルートのコンポーネント実装は HQ デザイントークン経由（Tailwind preset の utility または `@high-q/ui` プリミティブ経由）で描画される。マジックナンバー禁止。

#### Scenario: トップルートが動作する

- **WHEN** ブラウザで `/` にアクセスする
- **THEN** `HomePlaceholder.vue` が描画され、HQ paper 色背景・Zen Kaku Gothic 書体で "準備中" 表示が確認できる

#### Scenario: Login ルートが動作する

- **WHEN** ブラウザで `/login` にアクセスする
- **THEN** `LoginPlaceholder.vue` が描画される（実装内容は後続 #84 で置換される枠）

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

