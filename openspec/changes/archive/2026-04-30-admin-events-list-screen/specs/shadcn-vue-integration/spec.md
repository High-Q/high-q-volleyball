# shadcn-vue-integration Spec Delta — admin-events-list-screen

## MODIFIED Requirements

### Requirement: Login 用最小プリミティブのみが本基盤整備で取り込まれる

本 capability の取り込み範囲は、必要となる Issue ごとにインクリメンタルに拡張 SHALL する。各取り込み時点で具体的に何が `apps/admin/src/shared/ui/` および `apps/reservation/src/shared/ui/` 配下に存在しているかは、以下の累積リストで管理 MUST する:

- 初期取り込み（admin-reservation-ui-foundation, #175）: `Input.vue` / `Label.vue` / `FormField.vue`（admin / reservation 共通、Login #84 の必要分）
- admin-events-list-screen（#85）追加分: `Table.vue` / `Select.vue` / `Skeleton.vue`（admin のみ。イベント一覧の DataTable / フィルタ select / Loading skeleton 用）

`Dialog` / `Combobox` / `DataTable`（複合）/ `Toast` / `DatePicker` 等の追加は、必要となる後続 Issue の Apply タスク内で個別に取り込む MUST。各取り込みにおいて Tailwind preset 経由での着色（`var(--hq-*)` および HQ utility 経由）を満たす SHALL。

#### Scenario: admin に Table / Select / Skeleton が配置される

- **WHEN** `apps/admin/src/shared/ui/` 配下を確認する
- **THEN** `Input.vue` / `Label.vue` / `FormField.vue` に加えて `Table.vue`（およびそれが依存する `TableHeader` / `TableBody` / `TableRow` / `TableCell` / `TableHead` 等のサブコンポーネント）/ `Select.vue` / `Skeleton.vue` が存在する

#### Scenario: reservation 側には未取り込み

- **WHEN** `apps/reservation/src/shared/ui/` 配下を確認する
- **THEN** `Table.vue` / `Select.vue` / `Skeleton.vue` は存在しない（admin のみで使用するため、reservation で必要になる Issue で改めて取り込む）

#### Scenario: 取り込み済みプリミティブが当該 change の必要分に限定される

- **WHEN** 本 change archive 後の `apps/admin/src/shared/ui/` を確認
- **THEN** Login 必要分（Input / Label / FormField）+ Events List 必要分（Table / Select / Skeleton）以外の shadcn-vue 由来コンポーネントが存在しない

## ADDED Requirements

### Requirement: 取り込み済み shadcn-vue プリミティブにスモークテストが存在する（追加分）

新たに取り込んだ `Table.vue` / `Select.vue` / `Skeleton.vue` も、Vitest + `@vue/test-utils` で**最低 1 件のスモークテスト**（基本レンダリング + props 反映）を SHALL 持つ。テスト命名規約・配置（`<Component>.spec.ts` を同階層）は既存規約に従う。

#### Scenario: pnpm test が新規 shadcn-vue プリミティブを通す

- **WHEN** `pnpm --filter @high-q/admin test` を実行する
- **THEN** `Table` / `Select` / `Skeleton` のスモークテストが pass する
