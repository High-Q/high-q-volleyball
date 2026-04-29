# shared-ui Spec Delta

## ADDED Requirements

### Requirement: `@high-q/ui` は意匠系プリミティブに責務を限定する

`@high-q/ui`（`packages/ui`）は、HQ 独自のデザイン言語を体現する**意匠系プリミティブ**のみを提供しなければならない（SHALL）。具体的には以下の特性を満たす:

- 着色は `var(--hq-*)` CSS 変数経由のみ（Tailwind class や shadcn-vue を**含まない**）
- 3 アプリ（LP / admin / reservation）から共通に利用可能
- Vue 3 SFC + scoped CSS で実装

a11y 重視の機能系プリミティブ（`Input` / `Dialog` / `Combobox` / `DataTable` 等）は `@high-q/ui` の責務外とし、shadcn-vue capability（`shadcn-vue-integration`）が担う。

#### Scenario: `@high-q/ui` の各プリミティブが Tailwind / shadcn-vue 非依存である

- **WHEN** `packages/ui/package.json` の `dependencies` および `peerDependencies` を確認する
- **THEN** `tailwindcss` / `radix-vue` / shadcn-vue 系パッケージが含まれない（`vue` 以外の peer は無い）

#### Scenario: 意匠系プリミティブが LP からも利用できる

- **WHEN** `apps/lp` から `import { Button } from '@high-q/ui'` を実行する
- **THEN** Tailwind なしで `Button` が描画され、`var(--hq-*)` 経由で着色される

### Requirement: `@high-q/ui` は CTA ボタン（`Button`）の単一の真実の源である

CTA ボタンの見た目を 3 アプリで統一するため、`Button` は `@high-q/ui` のみが提供しなければならない（SHALL）。consumer アプリは shadcn-vue から `Button` を取り込まない。

#### Scenario: shadcn-vue Button が consumer に取り込まれていない

- **WHEN** `apps/admin/src/shared/ui/` および `apps/reservation/src/shared/ui/` の Vue ファイル一覧を確認する
- **THEN** `Button.vue` が存在しない（`@high-q/ui` の `Button` を import して利用する）
