## Purpose

LP アプリ（`apps/lp`）の Vite ビルド構成において、vendor 別 chunk 分割と訪問頻度の低いページ単位での code-splitting を規定する。initial chunk のサイズ低減と戻り訪問時のキャッシュ効率を両立し、LP の初回表示性能（LCP / FCP）に対する継続的なガードラインとして機能させる。

## Requirements

### Requirement: LP の Vite ビルドは vendor 別 chunk を分離する

LP の Vite 設定（`apps/lp/vite.config.js`）は `build.rollupOptions.output.manualChunks` を関数形式で定義し、`node_modules` 配下の依存を以下のグループに分割して出力 SHALL する:

- `vendor-vue`: `vue` 系および `@tanstack/vue-query`
- `vendor-vuetify`: `vuetify` 系
- `vendor-sentry`: `@sentry/*`
- `vendor-supabase`: `@supabase/*`

それ以外の `node_modules` 依存は Rollup の既定挙動に委ねる。グループ分けは更新頻度・サイズに基づく方針で、これ以上の細分化を行わない（HTTP/2 並列性と small-chunk オーバーヘッドのトレードオフ）。

#### Scenario: ビルド時に vendor chunk が分離される

- **WHEN** `pnpm --filter @high-q/lp build` を実行する
- **THEN** `dist/assets/` 配下に `vendor-vue-*.js` / `vendor-vuetify-*.js` / `vendor-sentry-*.js` / `vendor-supabase-*.js` が出力される

#### Scenario: initial chunk に Vuetify ランタイムが含まれない

- **WHEN** ビルド成果物の `dist/assets/index-*.js` を検査する
- **THEN** `vuetify` のソースは `index-*.js` ではなく `vendor-vuetify-*.js` に含まれている

### Requirement: 初回 paint で不要な LP ページは動的 import で遅延ロードする

`apps/lp/src/App.vue` は、訪問頻度が低く初回 paint に必須でないページコンポーネントを `defineAsyncComponent` 経由で読み込む SHALL。具体的には以下のページを動的 import 対象とする:

- `PrivacyPolicyPage`（`/privacy`）
- `ExternalTransmissionPage`（`/external-transmission`）
- `NotFoundView`（unknown path）

`HomePage`（`/`）は初回 paint の主導線のため、initial bundle に静的 import で残す SHALL。

#### Scenario: HomePage は initial bundle に含まれる

- **WHEN** ビルド成果物を検査する
- **THEN** `HomePage` のソースは initial chunk（`index-*.js`）に含まれており、別 chunk として分離されていない

#### Scenario: Privacy ページは別 chunk として分離される

- **WHEN** ビルド成果物を検査する
- **THEN** `PrivacyPolicyPage` のソースは `index-*.js` に含まれず、独立した chunk として `dist/assets/` 配下に存在する

#### Scenario: 動的 import 中の遷移が壊れない

- **WHEN** ユーザーが `/privacy` に遷移する
- **THEN** ページコンポーネントがネットワーク取得後に描画される（白画面が一瞬出ることは許容、Suspense フォールバックは未指定）

### Requirement: バンドルサイズと初期表示性能を計測し PR 本文に明示する

LP のビルド最適化に関わる PR は、以下を **PR 本文に貼る** SHALL:

- `dist/assets/index-*.js` の minified / gzip サイズ（before / after）
- Lighthouse Mobile（Slow 4G）での LCP / FCP（before / after）

これによりリグレッション・改善の度合いを Reviewer が即判定できる状態を維持する。

#### Scenario: 最適化 PR にサイズ比較が含まれる

- **WHEN** LP の vite.config.js または App.vue の code-splitting を変更する PR を作成する
- **THEN** PR 本文に `index-*.js` の before/after サイズと Lighthouse LCP/FCP の before/after が記載されている
