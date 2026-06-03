## 1. ベース整備（Tailwind 新規導入 / TS config / 不要依存撤去の準備）

- [ ] 1.1 `apps/lp/package.json` に `tailwindcss` / `postcss` / `autoprefixer` / `@high-q/tailwind-preset`（workspace:*）を `devDependencies` に追加、`pnpm install`
- [ ] 1.2 `apps/lp/tailwind.config.ts` を新規作成（`content: ["./index.html", "./src/**/*.{vue,ts}"]`、`presets: [hqPreset]`。admin の `tailwind.config.ts` をテンプレに）
- [ ] 1.3 `apps/lp/postcss.config.js` を新規作成（admin の構成を踏襲）
- [ ] 1.4 LP のグローバル CSS（`apps/lp/src/style.css` 新規 or 既存 `apps/lp/src/sass/` の root エントリ）に `@tailwind base; @tailwind components; @tailwind utilities;` を追加
- [ ] 1.5 `apps/lp/tsconfig.json` の `strict: true` を確認 / 有効化、admin と同等の設定に揃える（path alias `@/`, `@pages/`, `@widgets/`, `@entities/`, `@shared/` を維持）
- [ ] 1.6 `apps/lp/src/sass/` の中身を read して SCSS 撤去 vs 残置を判断（Open Question 解消）。判断結果を本タスクのコメントに記録

## 2. エントリポイント TS 化

- [ ] 2.1 `apps/lp/main.js` → `apps/lp/main.ts` にリネーム、Sentry init / consent / app mount を TS で書き直す（vue-router 導入はしない、現状の最小構成を維持）
- [ ] 2.2 `apps/lp/vite.config.js` → `apps/lp/vite.config.ts` にリネーム、Vuetify plugin / VuetifyResolver を撤去、`unplugin-vue-components` import を撤去、`@vitejs/plugin-vue` のみ残す。`manualChunks` から `vendor-vuetify` を削除
- [ ] 2.3 `apps/lp/components.d.ts` を削除（`unplugin-vue-components` 生成物、撤去で不要）
- [ ] 2.4 `apps/lp/index.html` の参照先を `main.ts` に更新

## 3. Vuetify 直接利用ファイルの置換

- [ ] 3.1 `apps/lp/src/App.vue` を `<script setup lang="ts">` 化、`<v-app>` `<v-main>` を `<div class="lp-app">` `<main class="lp-app__main">` + Tailwind utility に置換。既存の `--hq-color-paper` 利用と手動 popstate ルーティングは温存
- [ ] 3.2 `apps/lp/src/shared/ui/NotFoundView.vue` を Vuetify component なしで再実装（`@high-q/ui` の `Button` + Tailwind utility）、`<script setup lang="ts">` 化
- [ ] 3.3 `apps/lp/src/pages/privacy/ui/PrivacyPolicyPage.vue` の `<v-*>` を div + Tailwind utility 構造に置換、`<script setup lang="ts">` 化
- [ ] 3.4 `apps/lp/src/pages/external-transmission/ui/ExternalTransmissionPage.vue` を同様に置換、`<script setup lang="ts">` 化
- [ ] 3.5 `apps/lp/src/widgets/sample/` ディレクトリ全削除（デッドコード、どこからも import されていない）
- [ ] 3.6 `apps/lp/src/plugins/vuetify.js` 削除、`apps/lp/src/plugins/index.js` の Vuetify 登録を撤去（plugin が空になるなら `plugins/` ごと削除も可）
- [ ] 3.7 `apps/lp/src/test/mountWithVuetify.js` を削除、必要に応じて `apps/lp/src/test/mountWithRouter.ts` 等の代替を新規作成（既存テストが Vuetify mount を使っているなら同時に書き換え）

## 4. アイコン置換（@fortawesome / mdi-* 撤去）

- [ ] 4.1 `grep -rn "@fortawesome/\\|mdi-\\|@mdi/" apps/lp/src/` で使用箇所を enumerate
- [ ] 4.2 各使用箇所を inline SVG（`apps/lp/src/shared/ui/icons/` 配下に Vue SFC として配置）に置換
- [ ] 4.3 X (Twitter) アイコンが「公式ロゴ inline SVG」になっていることを `lp-layout` capability の Scenario に従って検証
- [ ] 4.4 `apps/lp/package.json` から `@fortawesome/fontawesome-free` 依存を撤去

## 5. 既存 widgets / pages の TS 化（Vuetify-free だが `.js` / `<script setup>` のまま残っているもの）

- [ ] 5.1 `apps/lp/src/widgets/` 配下の各 widget の `<script setup>` を `<script setup lang="ts">` 化（hero-first / about-section / concept / activities / event-list / faq-section / features-section / final-cta / first-time-flow / gallery-sns / hero-first / meta-strip / next-session-strip / not-for-you / reassurance-strip / site-footer / site-header / consent-banner / worries-section ほか）
- [ ] 5.2 `apps/lp/src/pages/home/` 配下の TS 化
- [ ] 5.3 `apps/lp/src/entities/event/` 配下の `.js` を `.ts` 化
- [ ] 5.4 `apps/lp/src/shared/lib/` の `.js` を `.ts` 化（loadGtm / contact-channels / 等）
- [ ] 5.5 `apps/lp/src/shared/api/` の `.js` を `.ts` 化（Supabase client 経由の API 関数）
- [ ] 5.6 `apps/lp/src/shared/config/sns.js` を `sns.ts` 化（`LINE_OPEN_CHAT_URL` / `X_URL` / `X_HANDLE` の型注釈）

## 6. Vuetify 周辺依存の撤去

- [ ] 6.1 `apps/lp/package.json` から `vuetify` / `vite-plugin-vuetify` / `eslint-plugin-vuetify` / `unplugin-vue-components` を削除
- [ ] 6.2 task 1.6 の判断に基づき、`sass` を残置 / 撤去
- [ ] 6.3 `pnpm install` で lockfile 更新

## 7. ESLint 設定の Vuetify-free 化

- [ ] 7.1 `apps/lp/.eslintrc.cjs` または相当の ESLint config から `eslint-plugin-vuetify` プリセットを撤去
- [ ] 7.2 `pnpm --filter @high-q/lp lint` で 0 error を確認

## 8. テストの追従

- [ ] 8.1 `apps/lp/src/**/*.spec.{js,ts}` をすべて TS 化（`<script setup lang="ts">` テスト相手の型を mount で正しく解決できる状態）
- [ ] 8.2 `mountWithVuetify` 経由のテストを `mount` 直接呼び出し or `mountWithRouter.ts` に書き換え
- [ ] 8.3 `pnpm --filter @high-q/lp test` で既存テスト全 pass

## 9. capability spec の影響反映の事前確認

- [ ] 9.1 `lp-layout` capability の Scenario 群（ハードコード色 / X アイコン / コンテナ層 / Drawer / フェードイン等）を実装が満たすか手動チェック
- [ ] 9.2 `lp-build-optimization` capability の Scenario 群（vendor chunk / vendor-vuetify 不在 / `vuetify` 撤去）を実装が満たすか手動チェック

## 10. 最終確認

- [ ] 10.1 `pnpm --filter @high-q/lp typecheck` で 0 error
- [ ] 10.2 `pnpm --filter @high-q/lp lint` で 0 error
- [ ] 10.3 `pnpm --filter @high-q/lp test` で全 pass
- [ ] 10.4 `pnpm build:lp` で成功し、`dist/assets/` に `vendor-vuetify-*.js` が **無い**ことを確認
- [ ] 10.5 `dist/assets/index-*.js` の minified / gzip サイズを before/after で計測、PR 本文に記録（`lp-build-optimization` capability の Requirement「バンドルサイズと初期表示性能を計測し PR 本文に明示する」遵守）
- [ ] 10.6 `grep -rn "vuetify\\|Vuetify\\|@mdi\\|mdi-\\|@fortawesome" apps/lp/src/ apps/lp/*.{ts,json}` で 0 件確認（撤去漏れチェック）
- [ ] 10.7 ローカル dev (`pnpm --filter @high-q/lp dev` で localhost:5173) でホーム / `/privacy` / `/external-transmission` / Drawer / フェードイン / Cookie 同意挙動を目視確認
- [ ] 10.8 PR draft 作成（タイトル: `refactor(lp): Vuetify → HQ デザインシステム + TypeScript 化 (#310, #319 統合)`、本文に bundle size before/after + Lighthouse before/after を明記）
- [ ] 10.9 Render Preview で全画面（375px / 720px / 1280px）目視確認、Lighthouse スコアが現状から -5pt 以上の悪化がないことを確認、翔太郎くんの目視 OK を取得
