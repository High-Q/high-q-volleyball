## Why

`apps/lp` は 3 アプリのうち唯一 Vuetify が残存している（admin / reservation は既に HQ デザインシステム = `@high-q/ui` + shadcn-vue + `@high-q/tailwind-preset` に統一済）。技術スタックの分裂は保守コストを上げ、デザイントークンの一元化を阻害し、LP の改修速度を落とす。あわせて LP は TypeScript 化も未完（`#130` 単独で進めると Vuetify 剥がし時に二度手間）。

LP は商用稼働中だが、Render Preview で全画面の見た目を確認できるため 1 PR で完結させ、リファクタ期間を短く保つ。

## What Changes

- `apps/lp` から Vuetify 関連依存（`vuetify` / `vite-plugin-vuetify` / `eslint-plugin-vuetify`）と Vuetify components (`<v-app>` / `<v-main>` / `<v-card>` / `<v-img>` / `<v-icon>` 等) を撤去
- HQ デザインシステム（`@high-q/ui` + shadcn-vue 必要分 + `@high-q/tailwind-preset`）を導入。LP には Tailwind 本体（`tailwindcss` / `postcss.config.js` / `tailwind.config.ts`）が未整備のため新規セットアップする
- LP 全 `.vue` を `<script setup lang="ts">` 化、`vite.config.js` → `vite.config.ts` / `main.js` → `main.ts`。`tsconfig` strict mode 有効化、`pnpm --filter @high-q/lp typecheck` を CI に組み込む
- アイコンは Vuetify 依存の MDI / `@fortawesome/fontawesome-free` を撤去し、HQ デザインシステムで採用しているアイコン方針（admin / reservation と同じ静的 SVG 直書き＋必要なら `lucide-vue-next`）に統一
- 一切 import されていない `apps/lp/src/widgets/sample/` を削除（デッドコード）
- **#319「unplugin-vue-components 0.26 → 32 メジャーアップグレード」を本変更に統合**: 当該プラグインは LP でしか使われておらず、かつ実質的に何も自動 import していないため、撤去する形で #319 を完了させる
- 既存挙動（Hero / Concept / Activities / Calendar / Footer / Drawer / フェードイン等）の見た目・動きは同等を維持

## Capabilities

### New Capabilities

なし

### Modified Capabilities

- `lp-layout`: 色参照を「Vuetify テーマトークン経由」から「HQ デザイントークン経由 (`var(--hq-color-*)` または Tailwind preset utility)」に更新。`v-container` 言及をレイアウト primitive 非依存に書き換え
- `lp-build-optimization`: Vuetify chunk 分割定義の撤去（vendor chunk 構成の更新）

## Impact

- 実装対象（apps/lp 配下）:
  - 設定: `package.json` / `vite.config.ts`（新規・`.js` から書き換え）/ `main.ts`（同上）/ `tsconfig.json` 更新 / `tailwind.config.ts` 新規 / `postcss.config.js` 新規
  - Vuetify 直接利用 5 ファイルの全面置換: `App.vue` / `shared/ui/NotFoundView.vue` / `pages/privacy/ui/PrivacyPolicyPage.vue` / `pages/external-transmission/ui/ExternalTransmissionPage.vue` / `widgets/sample/Sample.vue` (削除)
  - 既存 20 widgets / pages の TS 化（既に Vuetify は未使用、`<script>` → `<script setup lang="ts">` 化のみ）
  - Vuetify plugin 撤去: `plugins/vuetify.js` 削除、`plugins/index.js` の vuetify 登録撤去
  - テストユーティリティ: `test/mountWithVuetify.js` 撤去（→ 必要なら `mountWithRouter.ts` に置換）
- スコープ外: LP のデザイン刷新 / 機能追加 / vue-router 導入（LP は意図的に手動ルーティング維持）
- 関連 Issue: #310（本変更で完了）/ #319（unplugin-vue-components 撤去として完了）/ #130（既に CLOSED だが #310 が supersede）/ #175 #160（参考: admin/reservation の Vuetify 剥がし、LP デザイントークン統合）
- リリース: master merge で Render が即本番反映。Render Preview の全画面目視確認を merge 前必須とする
