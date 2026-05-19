## Why

LP の Vite ビルドで「chunk > 500 KB」警告が継続している。実害は出ていないが、index.js は **gzip 後 178 KB**（minified 571 KB）と大きく、LP は初回 paint 速度が SEO・直帰率に直結するため、中期的に最適化する余地がある。Vuetify のフルテーマ／全コンポーネント・Sentry・Supabase・TanStack Query などが単一の initial chunk に積み上がっているのが主因。

## What Changes

- `apps/lp/vite.config.js` に **`build.rollupOptions.output.manualChunks`** を追加し、`vue` / `vuetify` / `@sentry/*` / `@supabase/supabase-js` / `@tanstack/vue-query` を vendor 別 chunk に分離する。
- LP の **ページコンポーネントを動的 import 化** する。具体的には初回 paint で不要な `PrivacyPolicyPage` / `ExternalTransmissionPage` / `NotFoundView` を `defineAsyncComponent` で遅延ロードし、`HomePage` のみ initial bundle に残す。
- Lighthouse による **before / after の LCP / FCP 計測手順** を整備し、PR 説明に比較を載せる（手順を `docs/07-テスト/` 配下に短く追記）。
- `vite-plugin-vuetify` の autoImport 設定を**現状維持で確認**（既に on-demand）。styles の手動分割は本 change のスコープ外とする。

**目標**: `dist/assets/index-*.js` の **gzip 130 KB 以下**（Issue #233 暫定目標）。達成不可な場合は実測値と次施策候補（Sentry の遅延 init・Vuetify styles の手動分割等）を Follow-up Issue として記録する。

## Capabilities

### New Capabilities

- `lp-build-optimization`: LP の Vite ビルド最適化方針（vendor chunk 分割ルール・ページ単位の code-splitting 方針・サイズ計測の責務）を定義する。

### Modified Capabilities

なし。LP の振る舞い（表示内容・遷移）は変更しない。

## Impact

- 影響コード: `apps/lp/vite.config.js` / `apps/lp/src/App.vue`
- 影響 spec: 新規 `openspec/specs/lp-build-optimization/`
- ランタイム影響: 動的 import 化したページ（`/privacy` `/external-transmission` 等）は初回遷移時にネットワーク取得が 1 回挟まる（gzip 後数 KB〜十数 KB 程度の想定、Suspense フォールバックは未使用で Vue 標準挙動）。HomePage（`/`）は initial bundle に残るため挙動変化なし。
- 依存: なし。Issue #228（Supabase 導入）以降の build 警告に対する独立改善。
- リスク: vendor chunk 分割でキャッシュキーが変わるため、初回デプロイ後の戻り訪問では一度フル取得が発生する（恒久的副作用ではない）。
