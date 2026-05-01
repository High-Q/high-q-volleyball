## MODIFIED Requirements

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
