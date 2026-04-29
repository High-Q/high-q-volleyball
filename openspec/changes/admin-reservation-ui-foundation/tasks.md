# Tasks: admin/reservation UI 基盤整備

> Issue: #175 / Branch: `feature/175-admin-reservation-ui-foundation`
> Proposal: ./proposal.md / Design: ./design.md
>
> **テスト・ビルド実行ルール**: UI 変更タスクが連続する間は各タスクで `pnpm test` / `pnpm build` を実行せず、各アプリ完了タスク（5.8 / 6.9）と最終検証（8.x）でまとめて実行する。
> 例外（タスクごとに TDD を回す）: `tailwind-preset` の実装タスク（2.x）— 新規パッケージのため。

---

## 1. Setup

- [x] 1.1 ブランチ `feature/175-admin-reservation-ui-foundation` 上にいることを確認し、`master` 最新を rebase 済みであることを確認する
- [x] 1.2 `apps/admin/src` および `apps/reservation/src` の現状を再点検し、本 change で削除/置換するファイル（`App.vue` / `App.spec.ts` / `mountWithVuetify.ts`）の範囲を確認する

---

## 2. `packages/tailwind-preset` 新設

- [x] 2.1 `packages/tailwind-preset/package.json` を新設（`name: @high-q/tailwind-preset`、`workspace:*` で `@high-q/design-tokens` 依存、`tailwindcss` を peerDependencies、`typecheck` / `test` script）
- [x] 2.2 `packages/tailwind-preset/tsconfig.json` および `vitest.config.ts` を新設
- [x] 2.3 [TDD-RED] `packages/tailwind-preset/src/index.test.ts` で「HQ object 値が theme.extend に正しく反映される」テストを記述（`colors.paper === HQ.color.paper` 等）
- [x] 2.4 [TDD-GREEN] `packages/tailwind-preset/src/index.ts` に preset を実装し、HQ object（color → kebab-case / font / space → `hq-` prefix / radius → `hq-` prefix / shadow → `hq-` prefix）を `theme.extend` に展開する
- [x] 2.5 [TDD-REFACTOR] preset 内にリテラル色（`#xxxxxx` / `rgb(` / `rgba(`）が含まれないことを grep で確認、必要なら抽出
- [x] 2.6 ルートで `pnpm install` を実行し、`@high-q/tailwind-preset` がワークスペースに認識されることを確認
- [x] 2.7 `pnpm --filter @high-q/tailwind-preset typecheck` / `test` が pass することを確認

---

## 3. `apps/admin` の Tailwind 導入と Vuetify 剥がし

- [x] 3.1 `apps/admin/package.json` を更新: `vuetify` / `vite-plugin-vuetify` / `sass` を削除、`tailwindcss` / `postcss` / `autoprefixer` / `vue-router` / `radix-vue` / `class-variance-authority` / `clsx` / `tailwind-merge` / `@high-q/tailwind-preset` (`workspace:*`) を追加
- [x] 3.2 `apps/admin/tailwind.config.ts` を新設し `presets: [hqPreset]` で `@high-q/tailwind-preset` を適用、`content` に `index.html` と `src/**/*.{vue,ts,tsx}` を指定
- [x] 3.3 `apps/admin/postcss.config.js` を新設（tailwindcss + autoprefixer）
- [x] 3.4 `apps/admin/src/style.css` を新設し、`@import '@high-q/design-tokens/tokens.css'` と Tailwind directive（`@tailwind base; @tailwind components; @tailwind utilities;`）を記述
- [x] 3.5 `apps/admin/vite.config.ts` には既に Vuetify plugin が含まれていないことを確認、`vitest.config.ts` の `server.deps.inline: ["vuetify"]` を除去
- [x] 3.6 ルートで `pnpm install` を実行し、admin 配下の依存解決が成功することを確認

---

## 4. `apps/admin` の shadcn-vue プリミティブ取り込み

- [x] 4.1 `apps/admin/components.json` を新設（shadcn-vue 規約: `tailwind.config` / `aliases.components: @/shared/ui` / `aliases.utils: @/shared/lib/utils` / `style: default` / `framework: vue`）+ tsconfig/vite に `@/` alias 追加
- [x] 4.2 `apps/admin/src/shared/lib/utils.ts` に `cn()` ユーティリティ（`clsx` + `tailwind-merge` 合成）を実装
- [x] 4.3 `apps/admin/src/shared/ui/Input.vue` を作成（shadcn-vue 公式の Input 規約に準拠、Tailwind preset utility で着色、リテラル色禁止）
- [x] 4.4 `apps/admin/src/shared/ui/Label.vue` を作成（同上）
- [x] 4.5 `apps/admin/src/shared/ui/FormField.vue` を作成（label + slot + error message スロットの最小実装、vee-validate 統合は #84 で判断）
- [x] 4.6 `apps/admin/src/shared/ui/index.ts` で 3 プリミティブを named export
- [x] 4.7 `apps/admin/src/shared/ui/Input.spec.ts` / `Label.spec.ts` / `FormField.spec.ts` にスモークテスト 15 件追加・全 pass（typecheck と App.spec.ts は Section 5 で mountWithVuetify 置換後に解消）

---

## 5. `apps/admin` の Vue Router 導入と "準備中" 画面

- [x] 5.1 `apps/admin/src/app/router.ts` を新設（`/` → `HomePlaceholder` / `/login` → `LoginPlaceholder`、`createWebHistory()`、`router.beforeEach` 用拡張点コメント `// TODO(#84): auth guard をここに追加`）
- [x] 5.2 `apps/admin/src/pages/HomePlaceholder.vue` を新設（HQ paper 背景、Zen Kaku Gothic、"管理画面 — 準備中" 表示。Tailwind utility のみで着色、`@high-q/ui` Button を 1 つ配置して疎通確認）
- [x] 5.3 `apps/admin/src/pages/LoginPlaceholder.vue` を新設（後続 #84 で置換される枠。"Login — 準備中" + Tailwind utility での見た目確認 + `@high-q/ui/Button` 配置）
- [x] 5.4 `apps/admin/src/App.vue` を `<RouterView />` をマウントするレイアウトに書き換え、`main.ts` で `style.css` を import（CSS bundling 順序最適化）
- [x] 5.5 `apps/admin/src/main.ts` で `import router from './app/router'` し、`createApp(App).use(router).mount('#app')` に変更
- [x] 5.6 `apps/admin/src/test/mountWithVuetify.ts` を削除し、`mountWithRouter.ts` を新設（`createMemoryHistory()` + `createRouter()` で test 用 router を組み立てるヘルパー）
- [x] 5.7 `apps/admin/src/App.spec.ts` をルーティングスモークテストに書き換える（`/` で `HomePlaceholder` がマウント / `/login` で `LoginPlaceholder` がマウント）
- [x] 5.8 `pnpm --filter @high-q/admin typecheck` / `test` (18 件 pass) / `build` (47 modules) がすべて pass することを確認。`"type": "module"` 追加で postcss 警告も解消

---

## 6. `apps/reservation` を admin と同等の構成にする

- [x] 6.1 `apps/reservation/package.json` を 3.1 と同等の内容に更新
- [x] 6.2 `apps/reservation/tailwind.config.ts` / `postcss.config.js` / `src/style.css` を 3.2-3.4 と同等の内容で新設
- [x] 6.3 `apps/reservation/vite.config.ts` には既に Vuetify plugin が含まれていないことを確認、resolve.alias 追加 + vitest.config.ts の `inline: ["vuetify"]` 除去
- [x] 6.4 `apps/reservation/components.json` を 4.1 と同等の内容で新設
- [x] 6.5 `apps/reservation/src/shared/lib/utils.ts` に `cn()` を実装
- [x] 6.6 `apps/reservation/src/shared/ui/Input.vue` / `Label.vue` / `FormField.vue` を 4.3-4.5 と同等の実装で配置（admin と同じファイルを copy-paste で良い、shadcn-vue 哲学に沿う）
- [x] 6.7 `apps/reservation/src/shared/ui/index.ts` および各 `*.spec.ts` を追加
- [x] 6.8 `apps/reservation/src/app/router.ts` / `pages/HomePlaceholder.vue` / `pages/LoginPlaceholder.vue` を 5.1-5.3 と同等の内容で新設（reservation 文脈での "予約サイト 準備中" 表記）
- [x] 6.9 `apps/reservation/src/App.vue` / `main.ts` / `test/mountWithRouter.ts` / `App.spec.ts` を 5.4-5.7 と同等に整備
- [x] 6.10 `pnpm --filter @high-q/reservation typecheck` / `test` (17 件 pass) / `build` (47 modules) がすべて pass することを確認

---

## 7. ドキュメント更新

- [ ] 7.1 `docs/05-インターフェース/01-UI設計方針.md` の UI スタック表を「`@high-q/ui` (意匠系) + shadcn-vue (機能系) + `@high-q/tailwind-preset` + Vue Router」へ改訂し、棲み分けセクション（Button は `@high-q/ui` のみ等）を追記
- [ ] 7.2 `CLAUDE.md` Pillar 3 の UI スタック表を実態に合わせて更新

---

## 8. 最終検証 & PR

- [ ] 8.1 リポジトリルートで `pnpm -r typecheck` を実行し全パス確認
- [ ] 8.2 `pnpm -r test` を実行し全パス確認
- [ ] 8.3 `pnpm -r build` を実行し admin / reservation / lp / packages の build が全成功することを確認
- [ ] 8.4 `apps/admin` をローカル dev 起動し、`/` と `/login` の遷移が動作すること、HQ デザイントークン経由の見た目が崩れていないことを目視確認
- [ ] 8.5 `apps/reservation` で同様の目視確認
- [ ] 8.6 `apps/lp` がローカル dev で従来通り動作すること（本 change が LP に影響を与えていないこと）を目視確認
- [ ] 8.7 PR 作成（タイトル: `feat(ui): #175 admin/reservation UI 基盤整備（Tailwind preset + shadcn-vue + Vue Router）`、base: `master`）
- [ ] 8.8 CI（lint / typecheck / test / build / E2E smoke）全パスを確認
- [ ] 8.9 Render プレビュー URL で admin / reservation / lp の動作確認（翔太郎くん側で実施）

---

## 備考・ブロッカー

<!-- Apply 中に発生した課題・決定変更を記録 -->

- 
