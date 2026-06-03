## Context

`apps/lp` は 3 アプリのうち唯一 Vuetify が残存している（`vuetify` ^3.4 / `vite-plugin-vuetify` ^2.0 / `eslint-plugin-vuetify` ^2.1）。一方で widgets の大半は既に Vuetify を使わず作られており、Vuetify を直接 `import` または `<v-*>` を使うファイルは以下の 5 つ（+ 設定 / テストユーティリティ）:

- `apps/lp/src/App.vue` (`<v-app>` `<v-main>`)
- `apps/lp/src/shared/ui/NotFoundView.vue`
- `apps/lp/src/pages/privacy/ui/PrivacyPolicyPage.vue`
- `apps/lp/src/pages/external-transmission/ui/ExternalTransmissionPage.vue`
- `apps/lp/src/widgets/sample/Sample.vue`（どこからも import されていないデッドコード）
- 周辺: `plugins/vuetify.js` / `plugins/index.js` の Vuetify 登録 / `test/mountWithVuetify.js`

技術スタック前提:

- `apps/admin` / `apps/reservation` は `@high-q/ui` + shadcn-vue + `@high-q/tailwind-preset` 構成、アイコンは **静的 inline SVG** で統一（`lucide` 系も `@fortawesome` も使っていない）
- LP には **Tailwind 自体が未導入**（`tailwindcss` / `tailwind.config.*` / `postcss.config.*` が存在しない）。HQ デザインシステム導入時に新規セットアップする必要がある
- LP の `main.js` / `vite.config.js` は admin / reservation の `main.ts` / `vite.config.ts` よりシンプル（vue-router 未使用、Sentry のみ）
- LP は意図的に vue-router を使わず `window.location.pathname` + `popstate` で軽量な手動ルーティングを採用している（`apps/lp/src/App.vue:40-64`、`lp-build-optimization` capability で `defineAsyncComponent` による code splitting 戦略）。**本変更でも維持する**
- `lp-layout` capability spec の Requirement「ハードコードされたカラー値が CSS 内に存在しない」が「Vuetify テーマトークン経由」を SHALL としているため、本変更で「HQ デザイントークン経由」へ書き換える
- `lp-build-optimization` capability spec の vendor chunk 定義に `vendor-vuetify` chunk があるため、Vuetify 撤去と同時に削除する
- LP は商用稼働中（CLAUDE.md memory）。master merge は即 Render 本番反映

## Goals / Non-Goals

**Goals:**

- LP の UI 基盤を Vuetify から HQ デザインシステム (`@high-q/ui` + shadcn-vue 必要分 + `@high-q/tailwind-preset`) に統一
- LP 全 `.vue` を `<script setup lang="ts">` 化、`vite.config.ts` / `main.ts` 化、`pnpm --filter @high-q/lp typecheck` を CI で緑にする
- LP の見た目・挙動（Hero / Concept / Activities / Calendar / Drawer / Footer / フェードイン / Cookie 同意 / GTM 同意後ロード等）は同等を維持
- bundle size を悪化させない（むしろ Vuetify chunk の削除で改善見込み）
- `unplugin-vue-components` 撤去（#319 統合）
- `widgets/sample/` 削除（デッドコード掃除）

**Non-Goals:**

- LP のデザイン刷新・コピー変更・機能追加（別 Issue で別途）
- vue-router 導入（手動ルーティング維持）
- LP の Lighthouse スコアを現状から「向上」させる（目標は「回帰させない」）
- アイコンの統一ライブラリ（lucide 等）の新規導入

## Decisions

### Decision 1: Vuetify component → HQ デザインシステム 対応マップ

| Vuetify | 置換先 |
|---|---|
| `<v-app>` | `<div class="lp-app">` + Tailwind utility（min-height / 背景は CSS 変数 `var(--hq-color-paper)`）|
| `<v-main>` | `<main>` + Tailwind utility（既存 `lp-app__main` クラスは温存 or `<main class="...">` に統合）|
| `<v-card>` | shadcn-vue `Card` (`apps/lp/src/shared/ui/card.vue` に CLI 取得) または `<div>` + Tailwind utility |
| `<v-card-title>` / `<v-card-text>` | `<h2>` / `<p>` + Tailwind utility |
| `<v-btn>` | `@high-q/ui` の `Button`（admin / reservation と完全統一） |
| `<v-icon>` | 静的 inline SVG（`apps/lp/src/shared/ui/icons/` に分割配置、admin/reservation の方針を踏襲） |
| `<v-img>` | `@high-q/ui` の `Photo`（既に LP の hero-first / about / final-cta が使用済） |
| `<v-container>` | `<div>` + `max-w-screen-xl mx-auto px-hq-*` Tailwind utility |
| `<v-row>` / `<v-col>` | `<div>` + Tailwind `grid` / `flex` |

**理由:**

- admin / reservation との完全統一（`Button` は `@high-q/ui` のみ使用、shadcn-vue 機能系は必要時 CLI で各アプリ `shared/ui/` に取得） — CLAUDE.md Pillar 3 のプリミティブ棲み分け方針に従う
- アイコンは静的 inline SVG（admin/reservation と同じ）。`lucide-vue-next` 等の新規依存追加なし
- `<v-container>` の max-width は Tailwind の `max-w-screen-xl` 等の utility で十分代替可。レスポンシブブレークポイントも preset に揃える

### Decision 2: Tailwind 新規セットアップ方針

LP には Tailwind 自体が未整備のため、admin / reservation の構成を踏襲して新規セットアップする:

- `apps/lp/package.json` の `devDependencies` に `tailwindcss` / `postcss` / `autoprefixer` / `@high-q/tailwind-preset`（workspace:*） を追加
- `apps/lp/tailwind.config.ts` を新規作成（admin の `tailwind.config.ts` をテンプレに、`content: ["./index.html", "./src/**/*.{vue,ts}"]`、`presets: [hqPreset]`）
- `apps/lp/postcss.config.js` を新規作成
- グローバル CSS（`apps/lp/src/sass/` 直下 or 新規 `apps/lp/src/style.css`）の先頭に `@tailwind base; @tailwind components; @tailwind utilities;` を追加
- 既存の `.scss` ファイルとの共存: 段階的に `.scss` 内のハードコード値を Tailwind utility または `var(--hq-*)` に置換。SCSS 構文自体は残置可（sass dependency も Vuetify とは独立に保持判断は後述）

**理由:** 同じ HQ プリセットを使うことで、admin / reservation と完全に同じユーティリティクラス名・トークン値が LP でも使える。新規ライブラリの学習コストゼロ。

### Decision 3: TypeScript 化の戦略

**選定: 1 PR 一括（partial 不可）**

- `tsconfig.json` の `strict: true` を有効化（admin / reservation と同設定）
- `vite.config.js` → `vite.config.ts`、`main.js` → `main.ts` に拡張子変更 + 型注釈追加
- 全 `.vue` の `<script setup>` を `<script setup lang="ts">` に変更
- 全 `.js` を `.ts` に拡張子変更（`shared/lib/*.js` 等）
- `pnpm --filter @high-q/lp typecheck` が緑になることを完了条件とする
- CI の `typecheck` job が LP も対象に入っていることを確認（既に `pnpm -r typecheck` なら自動的に含まれる）

**理由:** 段階的 TS 化は中途半端なまま放置されやすく（過去 #130 が長期間オープンだった原因）、LP 規模（72 ファイル）なら 1 PR でやり切れる。型エラーは Vuetify component に依存していないファイルなら大半が `any` を狭めるだけで済む。

### Decision 4: アイコン戦略

**選定: 静的 inline SVG（admin / reservation と完全同一）**

- 既存の `@fortawesome/fontawesome-free` 依存は撤去
- LP 内で使われているアイコンを enumerate し、`apps/lp/src/shared/ui/icons/` に Vue SFC として配置（`<template><svg>...</svg></template>` の薄いラッパ）
- X (Twitter) アイコンは既に `lp-layout` capability で「公式 SVG ロゴ」を SHALL としているため、本変更でその実装を完成させる
- アニメーション・transition は CSS で実装（既存通り）

**理由:**

- admin/reservation と完全統一（依存ライブラリ数を増やさない）
- SVG ファイルサイズは小さく、tree-shaking 不要で常時最適
- `lucide-vue-next` 等のアイコンライブラリは将来導入する余地を残すが、本変更では新規依存を追加しない

### Decision 5: Vuetify 撤去後の周辺依存

| 依存 | 撤去 / 残置 | 理由 |
|---|---|---|
| `vuetify` | 撤去 | 本変更の目的 |
| `vite-plugin-vuetify` | 撤去 | Vuetify が無いと不要 |
| `eslint-plugin-vuetify` | 撤去 | 同上 |
| `@mdi/font` (もし依存にあれば) | 撤去 | アイコンは静的 SVG に統一 |
| `@fortawesome/fontawesome-free` | 撤去 | 同上 |
| `unplugin-vue-components` | 撤去 | #319 統合、実質何も auto-import していない |
| `sass` | **要判断（後述）** | Vuetify とは独立に使われている可能性 |
| `eslint-plugin-vue` | 残置 | Vue 用 lint は Vuetify 非依存で引き続き必要 |
| `vue-eslint-parser` | 残置 | 同上 |

`sass` については `apps/lp/src/sass/` ディレクトリの存在から SCSS ファイルが残っている可能性が高い。本変更では:

- 既存 `.scss` の **ハードコード色** だけを `var(--hq-color-*)` に置換
- `.scss` ファイル自体は SCSS 構文（変数 / mixin / nesting）に意味があるなら残置
- もし `.scss` を完全に Tailwind utility と CSS 変数で置換できれば `sass` も撤去

具体判断は実装時に `apps/lp/src/sass/` の内容を見てから決める（task 2.x で扱う）。

### Decision 6: lp-build-optimization の vendor chunk 構成更新

現状の `apps/lp/vite.config.js` には:

```js
if (id.includes("node_modules/vuetify/") || id.includes("node_modules/vite-plugin-vuetify/")) {
  return "vendor-vuetify";
}
```

Vuetify 撤去で `vendor-vuetify` chunk は不要。`lp-build-optimization` capability spec を更新し、`vendor-vue` / `vendor-supabase` / `vendor-sentry` のみ残す。LP に Tailwind が入ることで JS bundle に影響は出ない（Tailwind は build 時に CSS 生成、runtime に Tailwind ランタイムは存在しない）。

### Decision 7: 影響範囲のある capability spec

- `lp-layout`: **MODIFIED**
  - Requirement「ハードコードされたカラー値が CSS 内に存在しない」: 「Vuetify テーマトークン経由」を「HQ デザイントークン経由」に置換
  - Requirement「全セクションの横幅がヘッダーと揃う」: `v-container` 言及を Tailwind utility または semantic な記述に変更
  - Requirement「X (Twitter) アイコンは公式ロゴで統一される」: `mdi-twitter` 非使用を SHALL NOT に維持しつつ、置換先を「カスタム SVG または静的 inline SVG」と明確化
- `lp-build-optimization`: **MODIFIED**
  - vendor chunk 定義から `vendor-vuetify` を撤去
- `lp-calendar` / `lp-e2e-coverage` / `lp-fsd-structure` / `lp-social-share`: **無変更**（capability の挙動・構造に影響なし）

### Decision 8: テスト戦略

- 既存の vitest テストは `mountWithVuetify.js` 経由のものを `mount` 直接呼び出し or `mountWithRouter.ts` (本変更で新規追加、必要なら) に置換
- 既存 E2E (`lp-e2e-coverage` capability の playwright smoke) は **無変更で全 pass** を目標
- 新規テストの追加は最小限（component test の vitest baseline 維持のみ）
- 完了条件: `pnpm --filter @high-q/lp test` + `pnpm --filter @high-q/lp typecheck` + `pnpm build:lp` がすべて pass

### Decision 9: 移行検証戦略

LP は商用稼働中のため、Render Preview で **全画面の見た目を目視確認**してから merge する。確認対象:

1. `/`（HomePage: Hero / Concept / Activities / Event / Why High Q / Gallery & Social / Final CTA / Footer）
2. `/privacy`
3. `/external-transmission`
4. ハンバーガー Drawer 開閉 / アンカースクロール / フェードイン animation
5. Cookie 同意 → GTM 同意後ロードの挙動
6. モバイル幅（375px）/ tablet（720px）/ desktop（1280px）の 3 ブレークポイント

Lighthouse スコアは Render Preview で merge 前に計測し、Performance / Accessibility / Best Practices / SEO のいずれも **現状から -5 ポイント以上の悪化がない**ことを完了条件とする。

## Risks / Trade-offs

- **[Risk] Vuetify の細かな挙動（focus ring / transition / breakpoint）を完全には模倣できず、見た目の細部にずれが出る** → Mitigation: 既存 `lp-layout` の Scenario を 1 つずつ Render Preview で確認、ずれがあれば task 単位で修正
- **[Risk] LP に Tailwind を新規導入することで初回ビルドが遅くなる / CSS size が増える** → Mitigation: Tailwind の content config を厳密に絞る（`./src/**/*.{vue,ts}` のみ）、本番ビルドの purge が効くため runtime size は小さい
- **[Risk] 全 `.vue` を 1 PR で TS 化するため diff が巨大化し、レビューが困難** → Mitigation: 1 タスク 1 コミットの粒度で進める（CLAUDE.md Pillar 1）。タスクは widget / page 単位で分割
- **[Risk] sass / SCSS 残置判断を後送りにすると、最終的に SCSS と Tailwind の二重管理が混乱を呼ぶ** → Mitigation: task 内に「`apps/lp/src/sass/` の内容を読んで撤去 / 残置を判断するタスク」を明示
- **[Risk] アイコン置換漏れで `mdi-*` が残ると `lp-layout` capability の X アイコン Requirement が違反になる** → Mitigation: `grep -rn "mdi-" apps/lp/src/` で 0 件を完了条件に明記

## Migration Plan

1 PR で完結。Apply 中のタスクは widget / page 単位 + 設定単位で分割し、1 タスク 1 コミット粒度で進める（CLAUDE.md Pillar 1）。

ロールバック: Render 本番で大きな問題が出た場合は PR の merge commit を revert（master 直 push でロールバック）。LP は他 capability と独立しているため revert 影響範囲はクローズ。

## Open Questions

- **`apps/lp/src/sass/` 内の SCSS ファイルは残置か全撤去か** → 実装時 (task 2.x) に内容を確認して判断
- **`@fortawesome/fontawesome-free` を使っているアイコンの正確な enumeration** → 実装時 (task 4.x) に `grep` で抽出
- **shadcn-vue から LP に必要なプリミティブ**（admin / reservation で `Input` / `Label` / `FormField` のみ取得済。LP 用に `Card` / `Dialog` 等が必要かは置換時に判断）
