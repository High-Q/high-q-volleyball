## 1. Baseline 計測

- [x] 1.1 `pnpm --filter @high-q/lp build` を実行し、`dist/assets/index-*.js` の minified / gzip サイズと chunk 一覧を控える（before 値）
  - **before**: `index-*.js` 497.08 KB minified / **160.28 KB gzip**、`index-*.css` 340.97 KB / 43.64 KB gzip、module 数 688
- [ ] 1.2 `pnpm --filter @high-q/lp preview` を起動し、Chrome DevTools の Lighthouse Mobile（Slow 4G）で LCP / FCP を 3 回測定し中央値を控える（before 値）

## 2. vendor chunk 分離

- [x] 2.1 `apps/lp/vite.config.js` に `build.rollupOptions.output.manualChunks` を関数形式で追加し、`vendor-vue` / `vendor-vuetify` / `vendor-sentry` / `vendor-supabase` の 4 グループに分割する
- [x] 2.2 ビルドして `dist/assets/` 配下に 4 つの vendor-*.js が出力されること、および `index-*.js` から該当ライブラリが消えていることを確認
  - **after (vendor分離のみ, VITE_SENTRY_DSN セット時)**: `index-*.js` 46.81 KB / **gzip 20.25 KB**、`vendor-vue` 42.56 KB gzip、`vendor-vuetify` 46.44 KB gzip、`vendor-supabase` 51.80 KB gzip、`vendor-sentry` 33.76 KB gzip
  - DSN 未設定（ローカル）では Sentry が tree-shake で消え `vendor-sentry` は 0 KB になる。本番ビルドでは Render Dashboard で DSN がセットされるため上記の構成
- [x] 2.3 `pnpm --filter @high-q/lp test` を実行し既存テストが緑であることを確認 (46/46 passed)

## 3. ページ単位の動的 import

- [x] 3.1 `apps/lp/src/App.vue` の `PrivacyPolicyPage` / `ExternalTransmissionPage` / `NotFoundView` の import を `defineAsyncComponent(() => import(...))` 形式に書き換える
- [x] 3.2 `HomePage` は静的 import のまま据え置く（初回 paint の主導線）
- [x] 3.3 ビルドして `dist/assets/` 配下に Privacy / ExternalTransmission / NotFound 用の独立 chunk が出力されることを確認
  - `NotFoundView-*.js` 0.66 KB / gzip 0.53 KB、Privacy/ExternalTransmission 各 `index-*.js` chunk（3.17 KB / 6.25 KB）が独立出力。重複名は entry index と被るため将来 `chunkFileNames` で改名検討（本 change スコープ外）
- [ ] 3.4 **[翔太郎くん依頼]** `pnpm --filter @high-q/lp preview` で `/` → `/privacy` → `/external-transmission` を手動遷移し、各ページが正しく描画されること（白画面が解消後に描画されること）を確認

## 4. After 計測とサイズ比較

- [x] 4.1 ビルドして `index-*.js` の minified / gzip サイズ（after 値）を控える
  - **after (vendor 分離 + dynamic import + DSN セット)**: `index-*.js` 39.31 KB / **gzip 16.32 KB**、`vendor-vue` 43.29 KB gzip、`vendor-vuetify` 46.27 KB gzip、`vendor-supabase` 51.80 KB gzip、`vendor-sentry` 33.76 KB gzip
- [ ] 4.2 **[翔太郎くん依頼]** `vite preview` + Lighthouse Mobile で LCP / FCP を 3 回測定し中央値（after 値）を控える
- [x] 4.3 目標 `index-*.js` gzip 130 KB 以下が達成できたかを確認
  - **達成**: gzip 160.28 → **16.32 KB**（約 90% 削減、目標 130 KB を大幅にクリア）
  - 未達分のフォロー: 不要。Vuetify/Supabase/Sentry も別 chunk として並列ロードされるため、initial chunk 単位の目標は完全達成

## 5. ドキュメント反映

- [x] 5.1 PR 本文用に before / after の表（chunk サイズ + LCP / FCP）を作成し、change ディレクトリ内のメモまたは PR 作成時に直接貼る
  - `openspec/changes/lp-bundle-optimization/pr-notes.md` に保存（Lighthouse は翔太郎くん測定後に追記）
- [x] 5.2 目標未達の場合の Follow-up Issue タイトル候補（例: Sentry 遅延 init / Vuetify styles 手動分割）を控える
  - 目標達成済みのため緊急性なし。候補は `pr-notes.md` 末尾に Follow-up セクションとして記載

## 6. 最終確認

- [x] 6.1 `pnpm --filter @high-q/lp test` 緑確認 (46/46 passed)
- [x] 6.2 `pnpm --filter @high-q/lp build` 警告と chunk サイズ確認
  - 500 KB chunk size 警告は消失。最大 chunk は `vendor-supabase` 197 KB / gzip 52 KB
- [x] 6.3 `openspec validate lp-bundle-optimization --strict` 緑確認
