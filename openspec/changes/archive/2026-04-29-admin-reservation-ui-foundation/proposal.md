# Proposal: admin/reservation UI 基盤整備

> Issue: #175
> Epic: #166 (共通基盤を整える)
> 関連: 後続の #84 (admin Login) / #85-87, #171 (admin 各機能) / #89-92, #148 (reservation 各機能)

## Why

`apps/admin` および `apps/reservation` の機能実装（#84 以降）に着手するために必要な UI スタックが現状未整備で、CLAUDE.md / `docs/05-インターフェース/01-UI設計方針.md` の規定（shadcn/ui + Tailwind）と実装の `vuetify` 依存が乖離している。admin の最終形（DataTable / Dialog / DatePicker / Combobox / Toast 等）を見据えると、a11y 完璧な機能系プリミティブを最小コストで取得するため、Tailwind preset + shadcn-vue 基盤を**まだ admin/reservation がほぼ空のうち**に整備する必要がある（後から refactor する場合のコストは 5〜10 倍）。

## What Changes

- **NEW**: `packages/tailwind-preset` を新設し、HQ デザイントークン（`@high-q/design-tokens`）を Tailwind の `theme.extend` 形式で配布する
- **NEW**: shadcn-vue を `apps/admin` / `apps/reservation` の双方に導入し、Login (#84) で必要な最小プリミティブ（`Input` / `Label` / `FormField`）をリポジトリ内に取り込む
- **NEW**: `apps/admin` / `apps/reservation` 双方に `vue-router` を導入し、`/`（"準備中" 画面）と `/login`（プレースホルダ）の最低 2 ルートを動作させる
- **NEW**: `@high-q/ui`（意匠系プリミティブ）と shadcn-vue（機能系プリミティブ）の棲み分けルールを spec 化
- **BREAKING**: `apps/admin` / `apps/reservation` の `package.json` から `vuetify` / `vite-plugin-vuetify` 依存を削除（admin/reservation 側で Vuetify を import しているコードはまだ無いため実質的影響は無い）
- **MODIFIED**: `docs/05-インターフェース/01-UI設計方針.md` の UI スタック表と CLAUDE.md の Pillar 3 を、新スタック実態（`@high-q/ui` + shadcn-vue + Tailwind preset）と整合させる
- **NON-GOALS**: 個別機能（Login の認証ロジック / イベント CRUD / 予約フロー等）の実装、LP の Vuetify 剥がし、shadcn-vue の Login 用以外プリミティブ（DataTable / Dialog / DatePicker 等）の先取り取り込み

## Capabilities

### New Capabilities

- `tailwind-preset`: HQ デザイントークンを Tailwind の `theme.extend` 形式で配布する `packages/tailwind-preset` パッケージの責務・出力形式・consumer 側の利用契約を定義する
- `shadcn-vue-integration`: shadcn-vue の各 consumer アプリ（admin / reservation）への取り込み手順・配置先・shadcn-vue と `@high-q/ui` の棲み分け契約を定義する
- `app-routing`: `apps/admin` / `apps/reservation` の Vue Router 構成（ルート定義配置 / レイアウト / 将来の auth guard 拡張点）を定義する

### Modified Capabilities

- `shared-ui`: `@high-q/ui`（意匠系プリミティブ）と shadcn-vue（機能系プリミティブ）の責務分担を明文化する要件を追加する
- `monorepo-workspace`: 新規パッケージ `packages/tailwind-preset` をワークスペースに含める要件を追加する

## Impact

### 影響するコンポーネント・ファイル

- `packages/tailwind-preset/`（新設） — package.json / preset 本体（TS export）/ `tokens.css` 連携
- `packages/ui/` — shadcn-vue との棲み分けに関する spec/README 追記（実装変更は最小）
- `apps/admin/`
  - `package.json` — `vuetify` / `vite-plugin-vuetify` 削除、`tailwindcss` / `@high-q/tailwind-preset` / `vue-router` / `radix-vue`（shadcn-vue 依存）追加
  - `vite.config.ts` — Vuetify plugin 削除、Tailwind 統合
  - `tailwind.config.ts`（新設）/ `postcss.config.js`（新設）
  - `src/` — `main.ts` で router マウント、`src/router/`、`src/pages/HomePlaceholder.vue` / `src/pages/LoginPlaceholder.vue`、shadcn-vue プリミティブ配置先 `src/shared/ui/`
- `apps/reservation/` — admin と同等の構成変更
- `docs/05-インターフェース/01-UI設計方針.md` — UI スタック表と棲み分けルール改訂
- `CLAUDE.md` — Pillar 3 の UI スタック表改訂
- `openspec/specs/shared-ui/spec.md` / `openspec/specs/monorepo-workspace/spec.md` — 上記 Modified Capabilities に対応する delta 反映（archive 後）

### 依存関係への影響

- 新規 npm 依存: `tailwindcss` / `@tailwindcss/forms`（任意）/ `radix-vue` / `vue-router` / shadcn-vue 関連（`class-variance-authority` / `clsx` / `tailwind-merge`）
- 削除依存: `vuetify` / `vite-plugin-vuetify`（admin / reservation のみ。LP は本 change では維持）

### 後続 Issue への効果

本 change の archive 後、`#84`（admin Login）以降の機能 Issue は新スタック前提で着手可能になる。
