# shadcn-vue-integration Specification

## Purpose
TBD - created by archiving change admin-reservation-ui-foundation. Update Purpose after archive.
## Requirements
### Requirement: shadcn-vue プリミティブは各アプリの `src/shared/ui/` に配置される

shadcn-vue CLI（`npx shadcn-vue@latest add <component>`）で取り込んだコンポーネントは、**各 consumer アプリの `src/shared/ui/`** 配下に配置されなければならない（SHALL）。複数アプリで同じコンポーネントが必要な場合はファイルが重複して存在する（共通化しない）。

#### Scenario: admin に Input が配置される

- **WHEN** `apps/admin/src/shared/ui/` 配下を確認する
- **THEN** `Input.vue` / `Label.vue` / `FormField.vue` が存在し、各アプリ起点で import できる

#### Scenario: reservation 側にも独立して配置される

- **WHEN** `apps/reservation/src/shared/ui/` 配下を確認する
- **THEN** admin と同名の `Input.vue` / `Label.vue` / `FormField.vue` が独立して存在する

### Requirement: shadcn-vue 取り込みに必要な設定ファイルが各アプリに存在する

各 consumer アプリ（`apps/admin` / `apps/reservation`）には、shadcn-vue CLI が利用する `components.json` と Tailwind 設定が存在し、shadcn-vue の `add` コマンドが正常に動作する状態でなければならない（SHALL）。

#### Scenario: components.json が存在する

- **WHEN** `apps/admin/components.json` を確認する
- **THEN** shadcn-vue の規約に沿った設定（`tailwind.config` パス、`aliases.components` = `@/shared/ui`、`aliases.utils` = `@/shared/lib/utils` 等）が記述されている

#### Scenario: shadcn-vue add が成功する

- **WHEN** `apps/admin` 配下で `npx shadcn-vue@latest add button --yes` を試行する（参考動作確認）
- **THEN** CLI がエラーなく完了し、コンポーネントが `src/shared/ui/` に追加される（実際の取り込みコンポーネントは Login 用の Input / Label / FormField のみとする）

### Requirement: 取り込んだ shadcn-vue プリミティブは HQ デザイントークン経由で着色される

`apps/<app>/src/shared/ui/*.vue` 配下の shadcn-vue 由来コンポーネントは、Tailwind preset（`@high-q/tailwind-preset`）の utility class または `var(--hq-*)` CSS 変数経由でのみ着色されなければならない（SHALL）。マジックナンバー（リテラル `#xxxxxx` / `rgb()` / `rgba()`）の埋め込みは禁止する。

#### Scenario: shadcn-vue Input が HQ token で着色される

- **WHEN** `apps/admin/src/shared/ui/Input.vue` を render する
- **THEN** border / background / text の各色が Tailwind preset の HQ utility（`border-hairline` / `bg-paper` / `text-ink` 等）を経由して描画される

#### Scenario: shadcn-vue 系ファイルにリテラル色が無い

- **WHEN** `apps/admin/src/shared/ui/**/*.vue` および `apps/reservation/src/shared/ui/**/*.vue` を `#[0-9a-f]{3,6}\b`、`rgb(`、`rgba(` で grep する
- **THEN** マッチが 0 件である

### Requirement: `@high-q/ui`（意匠系）と shadcn-vue（機能系）の責務分離が明文化されている

リポジトリ内のドキュメント（`docs/05-インターフェース/01-UI設計方針.md`）は、`@high-q/ui` と shadcn-vue の責務分離を以下の基準で明示しなければならない（SHALL）:

- `@high-q/ui`: HQ 独自のデザイン言語を体現するプリミティブ（`Button` / `Kicker` / `Badge` / `Photo` / `RemainBar` 等）。`var(--hq-*)` で着色、Tailwind / shadcn-vue 非依存。3 アプリ（LP 含む）共通利用。
- shadcn-vue: a11y 完璧な機能系プリミティブ（`Input` / `Label` / `Dialog` / `Combobox` / `DataTable` 等）。各アプリで `src/shared/ui/` に配置、Tailwind preset で着色。

`Button` は `@high-q/ui` が責務を持ち、shadcn-vue の `Button` は取り込まない（CTA の見た目をアプリ間で統一するため）。

#### Scenario: UI 設計方針ドキュメントに棲み分けが記載されている

- **WHEN** `docs/05-インターフェース/01-UI設計方針.md` を確認する
- **THEN** 「`@high-q/ui` と shadcn-vue の棲み分け」セクションが存在し、上記の責務分離基準が記述されている

### Requirement: 取り込み済みプリミティブの累積管理

本 capability の取り込み範囲は、必要となる Issue ごとにインクリメンタルに拡張 SHALL する。各取り込み時点で具体的に何が `apps/admin/src/shared/ui/` および `apps/reservation/src/shared/ui/` 配下に存在しているかは、以下の累積リストで管理 MUST する:

- 初期取り込み（admin-reservation-ui-foundation, #175）: `Input.vue` / `Label.vue` / `FormField.vue`（admin / reservation 共通、Login #84 の必要分）
- admin-events-list-screen（#85）追加分: `Table.vue`（+ サブコンポーネント `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` / `TableCaption`） / `Select.vue`（+ サブコンポーネント `SelectTrigger` / `SelectValue` / `SelectContent` / `SelectItem`） / `Skeleton.vue`（admin のみ。イベント一覧の DataTable / フィルタ select / Loading skeleton 用）
- admin-events-crud-screen（#86）追加分: `AlertDialog.vue`（+ サブコンポーネント `AlertDialogTrigger` / `AlertDialogContent` / `AlertDialogHeader` / `AlertDialogFooter` / `AlertDialogTitle` / `AlertDialogDescription` / `AlertDialogAction` / `AlertDialogCancel`） / `Toast.vue`（+ `Toaster.vue` / `useToast.ts` / `ToastProvider.vue` / `ToastViewport.vue` / `ToastTitle.vue` / `ToastDescription.vue` / `ToastClose.vue`）（admin のみ。イベント CRUD の削除確認 / 保存通知用）

`Button` は `@high-q/ui` が責務を持ち、shadcn-vue の `Button` は取り込まない MUST（CTA の見た目をアプリ間で統一するため、棲み分け原則を維持）。`Textarea` / `RadioGroup` / `Dialog`（汎用） / `Combobox` / `DatePicker` 等の追加は、必要となる後続 Issue の Apply タスク内で個別に取り込む MUST。各取り込みにおいて Tailwind preset 経由での着色（`var(--hq-*)` および HQ utility 経由）を満たす SHALL。

#### Scenario: admin に CRUD 用プリミティブが配置される

- **WHEN** `apps/admin/src/shared/ui/` 配下を確認する
- **THEN** Login 必要分（Input / Label / FormField）+ Events List 必要分（Table 群 / Select 群 / Skeleton）+ Events CRUD 必要分（AlertDialog 群 / Toast 群）が存在する

#### Scenario: reservation 側には Events CRUD 用プリミティブ未取り込み

- **WHEN** `apps/reservation/src/shared/ui/` 配下を確認する
- **THEN** `AlertDialog.vue` / `Toast.vue` は存在しない（admin のみで使用するため、reservation で必要になる Issue で改めて取り込む）

#### Scenario: shadcn-vue Button が取り込まれていない

- **WHEN** `apps/admin/src/shared/ui/` および `apps/reservation/src/shared/ui/` を確認する
- **THEN** `Button.vue` の shadcn-vue 由来コンポーネントは存在しない（CTA は `@high-q/ui` の Button を利用）

#### Scenario: 取り込み済みプリミティブが累積リストの範囲に限定される

- **WHEN** `apps/admin/src/shared/ui/` および `apps/reservation/src/shared/ui/` の Vue ファイル一覧を確認する
- **THEN** Login 必要分 + Events List 必要分 + Events CRUD 必要分以外の shadcn-vue 由来コンポーネントが存在しない（追加が必要な場合は後続 Issue で対応する）

### Requirement: shadcn-vue 由来プリミティブにスモークテストが存在する

各取り込み済みプリミティブは、Vitest + `@vue/test-utils` で**最低 1 件のスモークテスト**（基本レンダリング + props 反映）を持たなければならない（SHALL）。新たに取り込んだプリミティブも同様のテストを SHALL 持つ。

#### Scenario: pnpm test が shadcn-vue プリミティブのテストを通す

- **WHEN** `pnpm --filter @high-q/admin test` および `pnpm --filter @high-q/reservation test` を実行する
- **THEN** Login 系（`Input` / `Label` / `FormField`）+ Events List 系（`Table` / `Select` / `Skeleton`）のスモークテストが pass する

