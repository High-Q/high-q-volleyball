## MODIFIED Requirements

### Requirement: LP の Vite ビルドは vendor 別 chunk を分離する

LP の Vite 設定（`apps/lp/vite.config.ts`）は `build.rollupOptions.output.manualChunks` を関数形式で定義し、`node_modules` 配下の依存を以下のグループに分割して出力 SHALL する:

- `vendor-vue`: `vue` 系および `@tanstack/vue-query`
- `vendor-sentry`: `@sentry/*`
- `vendor-supabase`: `@supabase/*`

それ以外の `node_modules` 依存は Rollup の既定挙動に委ねる。グループ分けは更新頻度・サイズに基づく方針で、これ以上の細分化を行わない（HTTP/2 並列性と small-chunk オーバーヘッドのトレードオフ）。

Vuetify は LP の UI 基盤から撤去され、`@high-q/ui` + shadcn-vue + `@high-q/tailwind-preset` で代替される MUST。これに伴い旧来の `vendor-vuetify` chunk は廃止する MUST NOT（存在してはならない）。Tailwind preset 由来の CSS は build 時に CSS として生成され、JS bundle には載らないため、新たな vendor chunk の追加は不要 SHALL。

#### Scenario: ビルド時に vendor chunk が分離される

- **WHEN** `pnpm --filter @high-q/lp build` を実行する
- **THEN** `dist/assets/` 配下に `vendor-vue-*.js` / `vendor-sentry-*.js` / `vendor-supabase-*.js` が出力される

#### Scenario: vendor-vuetify chunk が出力されない

- **WHEN** ビルド成果物の `dist/assets/` を検査する
- **THEN** `vendor-vuetify-*.js` ファイルが存在しない（Vuetify を撤去したため）

#### Scenario: initial chunk に Vuetify ランタイムが含まれない

- **WHEN** ビルド成果物の `dist/assets/index-*.js` を検査する
- **THEN** `vuetify` のソースは bundle 全体に含まれていない（依存自体が package.json から撤去されている）
