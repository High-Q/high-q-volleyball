# Tasks: admin-events-crud-screen

> 進捗: 47 / 48（残り 12.6 翔太郎くんの目視確認のみ）
> 各タスクは TDD（RED→GREEN→REFACTOR）。CLAUDE.md の Apply ルール（UI 変更連続時は最終確認タスクで一括テスト実行）に従う。
> Apply 開始時の宣言: 「project.md と design.md を読み直しました。技術制約: FSD レイヤー / shadcn-vue 機能系プリミティブ / Tailwind preset / 1 EventForm を mode で create/edit 共有 / 即時公開ポリシー（visibility = 'published' 固定投入）」

## 1. Setup（shadcn-vue プリミティブ取り込み）

- [x] 1.1 `apps/admin` 配下で `pnpx shadcn-vue@latest add alert-dialog toast --yes`（または手動 copy-paste）で `AlertDialog.vue`（+ `AlertDialogTrigger`/`AlertDialogContent`/`AlertDialogHeader`/`AlertDialogFooter`/`AlertDialogTitle`/`AlertDialogDescription`/`AlertDialogAction`/`AlertDialogCancel`） / Toast 群（`Toast.vue` / `Toaster.vue` / `useToast.ts` / `ToastProvider.vue` / `ToastViewport.vue` / `ToastTitle.vue` / `ToastDescription.vue` / `ToastClose.vue`）を `apps/admin/src/shared/ui/` に配置 — 手動 copy-paste で実装（radix-vue ベース、HQ token 着色）
- [x] 1.2 取り込んだプリミティブの色・spacing 指定を Tailwind preset utility または `var(--hq-*)` 経由に置換。リテラル hex / rgb / 任意値クラスの混入が無いことを grep（`#[0-9a-f]{3,6}\b` / `rgb(` / `rgba(`）で確認 — grep 0 件
- [x] 1.3 各プリミティブに最低 1 件のスモークテスト（`*.spec.ts`）を書き、`pnpm --filter @high-q/admin test` で pass させる — AlertDialog 3/3 + Toast 3/3 = 6/6 pass
- [x] 1.4 `apps/admin/src/shared/ui/index.ts` に取り込んだプリミティブを export 追加

## 2. Domain: shared types 拡張（TDD）

- [x] 2.1 `packages/shared/src/types/entities.ts` に新規 `EventUpdate` 型を追加（`name?` / `start_at?` / `end_at?` / `venue_id?` / `fee?` のみ。`visibility` / `capacity` / `description` / `cancel_deadline` / `status` は意図的に除外し、その理由を JSDoc に明記）
- [x] 2.2 `packages/shared/src/types/entities.spec.ts`（無ければ作成）に「EventUpdate 型は visibility を含まない」「全フィールド optional」の型レベルテスト（`expectTypeOf` / `assertType`）を追加 — 11/11 pass
- [x] 2.3 `packages/shared/src/index.ts` から `EventUpdate` を export — `entities.ts` の `*` 再エクスポート経由で公開
- [x] 2.4 `pnpm --filter @high-q/shared test` で pass — 全 48 テスト pass

## 3. Domain: entities/event API 拡張（TDD + MSW）

- [x] 3.1 `apps/admin/src/entities/event/api/eventQueries.spec.ts` に追加テストを RED で書く: `getEventById(id)` が events を SELECT して `Result<Event | null>` を返す / `createEvent(insert)` が INSERT し新 id を返す（**ペイロードに `visibility: 'published'` を含み、`capacity: null` / `description: null` / `cancel_deadline: null` も投入されることを検証**）/ `updateEvent(id, patch)` が UPDATE する（**ペイロードに `visibility` / `capacity` / `description` / `cancel_deadline` キーを含まないことを検証**）/ `deleteEvent(id)` が DELETE する / RLS / FK エラーは `Result.Err` で返す（特に `RESERVATIONS_EXIST` のマッピング） — 27/27 pass
- [x] 3.2 `apps/admin/src/entities/event/api/eventQueries.ts` に `getEventById` / `createEvent` / `updateEvent` / `deleteEvent` を実装し 3.1 を pass させる。`createEvent` 内で `visibility = 'published'` を上書き固定し、`capacity` / `description` / `cancel_deadline` を NULL で投入する。`updateEvent` は allowlist で安全な列のみ抽出
- [x] 3.3 `apps/admin/src/entities/event/api/index.ts` の export を更新 — `entities/event/index.ts` 経由で 4 関数を公開

## 4. Domain: useVenues 昇格移動

- [x] 4.1 `apps/admin/src/widgets/events-list/composables/useVenues.ts` を `apps/admin/src/entities/venue/composables/useVenues.ts` に移動。`apps/admin/src/entities/venue/index.ts` を新規作成し export — git mv で history 維持
- [x] 4.2 既存の events-list widget の import path を更新（`useVenues` の参照を `entities/venue` 経由に切替） — EventsListWidget.vue / spec / EventsListPage.spec.ts 更新
- [x] 4.3 `pnpm --filter @high-q/admin test` で既存テストが pass し続けることを確認 — 245/245 pass

## 5. Widget: form schema（純関数バリデーション、TDD）

- [x] 5.1 `apps/admin/src/widgets/event-form/model/eventFormSchema.spec.ts` を書く: `validateEventForm(form)` が `ValidationErrors` を返す。必須項目（タイトル 1-100 / 開催日 / 開始 / 終了 / 会場）/ 整合性（end > start）/ fee（空 OK / 0 以上の整数 / 負は NG）の全ケースを網羅 — 19/19 pass
- [x] 5.2 `eventFormSchema.ts` に `validateEventForm` / `EventFormState` 型 / `ValidationErrors` 型 を実装し 5.1 を pass させる。`@high-q/shared` の `Result<T>` パターンと整合させる
- [x] 5.3 `apps/admin/src/widgets/event-form/composables/useVolumeSuggest.spec.ts` を書く: events 0 件 → undefined / 1 件「ゆる練 vol.42」 → "ゆる練 vol.43" / 複数件で最大選択 / 命名規則違反は無視 / クエリ失敗で undefined（throw しない） — 6/6 pass
- [x] 5.4 `useVolumeSuggest.ts` を実装し 5.3 を pass させる

## 6. Widget: 子コンポーネント（TDD）

- [x] 6.1 `apps/admin/src/widgets/event-form/ui/FormSection.vue` を実装。props: `kicker: string` / `title: string` / `hint?: string`、default slot。`FormSection.spec.ts` で kicker / title / hint / slot 描画をテスト — 4/4 pass
- [x] 6.2 `apps/admin/src/widgets/event-form/ui/SectionBasic.vue`（01 基本情報）を実装。props: `modelValue: EventFormState` / `errors: ValidationErrors` / `venues: Venue[]`、emit: `update:modelValue`。タイトル + 開催日 + 開始 + 終了 + 会場 select + 参加費（プリセット ¥500 / ¥1,000 / 自由入力ボタン）。`SectionBasic.spec.ts` で必須属性 / 値反映 / バリデーションエラー表示 / aria-invalid 付与 / 参加費プリセット押下で値反映 / 参加費の任意性（空欄保存可） — 9/9 pass

## 7. Widget: EventForm 統合（TDD）

- [x] 7.1 `apps/admin/src/widgets/event-form/composables/useEventForm.ts` を実装。引数: `mode: 'create' | 'edit'` / `initialEvent?: Event`。expose: `state`（reactive）/ `errors`（computed）/ `isDirty` / `isSubmitting` / `submitError` / `submit()` / `reset()`。Create 時の API ペイロードは createEvent 内で固定上書き、Edit 時は visibility 等を含めず allowlist で送る
- [x] 7.2 `useEventForm.spec.ts` を書く（MSW）: Create 成功時の Toast + router.replace + ペイロード `visibility = 'published'` / `capacity = null` 検証 / Update 成功時の dirty クリア + ペイロードに `visibility` / `capacity` キー無し検証 / 保存失敗時の Banner / バリデーションエラー時の submit 中止 — 9/9 pass
- [x] 7.3 `apps/admin/src/widgets/event-form/ui/EventForm.vue` を実装。`useEventForm` + `useVolumeSuggest` + `SectionBasic` を束ねる。ヘッダのアクション構成は mode で分岐（Create: キャンセル/保存、Edit: 削除 slot/保存）。「削除」は `headerActions` slot で受け取る形にして、widget 内で feature を直 import しない
- [x] 7.4 `EventForm.spec.ts` で 4 状態 / mode によるアクション構成 / submit 動線 / 保存ボタン disabled / namePlaceholder / 削除 slot 反映 / Banner 表示 — 8/8 pass
- [x] 7.5 `widgets/event-form/index.ts` で `EventForm` / `useEventForm` / `EventFormState` / `ValidationErrors` / `validateEventForm` / `emptyEventForm` を export

## 8. Feature: event-delete（TDD）

- [x] 8.1 `apps/admin/src/features/event-delete/composables/useEventDelete.spec.ts` を書く（MSW）: confirm() で deleteEvent + Toast「削除しました」+ router.push('/events') / 失敗時に Dialog 内 inline error / RESERVATIONS_EXIST で「予約があるため削除できません」表示 — 8/8 pass
- [x] 8.2 `useEventDelete.ts` を実装し 8.1 を pass — エラーメッセージマッパー + isOpen / isDeleting / deleteError 状態管理
- [x] 8.3 `EventDeleteDialog.vue` を実装。`AlertDialog` で「このイベントを削除しますか？」+ サブ説明 + 「キャンセル」「削除する」ボタン。`role="alertdialog"` + `aria-labelledby` + `aria-describedby`。エラー表示用 `role="alert"` 確保。確認ボタンは radix の auto-close を回避するため plain button
- [x] 8.4 `EventDeleteDialog.spec.ts` で Open / Cancel / Confirm / Error 各シナリオ — 5/5 pass（ESC は radix-vue 内部で a11y 担保 + jsdom で focus trap が成立しないためスモークから除外）
- [x] 8.5 `features/event-delete/index.ts` で `EventDeleteDialog` / `useEventDelete` を export

## 9. Pages + Router

- [x] 9.1 `apps/admin/src/pages/EventCreatePage.vue` を実装。レイアウト枠 + `<EventForm mode="create" />`。`EventCreatePage.spec.ts` でマウント確認 — 1/1 pass
- [x] 9.2 `apps/admin/src/pages/EventEditPage.vue` を実装。route param `:id` から `getEventById` を fetch → 4 状態（Loading skeleton / Error「一覧へ戻る」/ 取得成功で `<EventForm mode="edit" :initial-event />` + `<EventDeleteDialog>`）。`EventEditPage.spec.ts` で 4 状態 + 削除フロー — 5/5 pass
- [x] 9.3 `apps/admin/src/app/router.ts` を更新: `/events/new` を実コンポーネントへ + `/events/:id/edit` を admin guard 配下に追加 — router.spec の routes 数も更新
- [x] 9.4 既存の `EventsNewPage.vue`（プレースホルダ）を削除し、router の reference を切替 — `git rm` で履歴維持
- [x] 9.5 `apps/admin/src/app/App.vue` の root に `<Toaster />` をマウント

## 10. 一覧画面（#85）からの接続

- [x] 10.1 `EventsToolbar.vue` の「新規作成」CTA — #85 で `clickNew` emit → `EventsListWidget.goNew()` → `router.push({ name: "events-new" })` で配線済み。`events-new` route が今回 `EventCreatePage` に実体化したので追加変更不要
- [x] 10.2 `EventsTable.vue` の「編集」リンク — `<RouterLink :to="\`/events/\${row.id}/edit\`">` で既に書かれており、今回 `events-edit` route が追加されたので実遷移する
- [x] 10.3 `EventsEmptyState.vue` の「新規作成」CTA — 同じく `clickNew` emit 経由で配線済み
- [x] 10.4 既存テストが回帰していないことを `pnpm --filter @high-q/admin test` で確認 — 318/318 pass

## 11. E2E（Playwright、上限 2 件）

- [x] 11.1 / 11.2 / 11.3 `e2e/admin/events-crud.e2e.ts` を作成 — #85 と同じ運用方針（auth guard 確認のみ E2E、UI フローは component test 35 件で網羅）に従い、`/events/new` と `/events/:id/edit` への未認証アクセスが `/login` redirect される 2 件を E2E で確認。happy path / 削除 edge case の詳細は useEventForm.spec.ts / useEventDelete.spec.ts / EventForm.spec.ts / EventDeleteDialog.spec.ts / EventEditPage.spec.ts でカバー済み。`pnpm exec playwright test --project admin --grep "events CRUD"` で 2/2 pass

## 12. 最終確認（CLAUDE.md ルール: UI 変更連続時は最終で一括実行）

- [x] 12.1 lint script は admin に未登録のため `vue-tsc` typecheck で代替 — `pnpm --filter @high-q/admin run typecheck` clean（vue-tsc --noEmit で 0 エラー）
- [x] 12.2 `pnpm --filter @high-q/admin test` の Vitest 全件 pass — 318/318
- [x] 12.3 `pnpm --filter @high-q/admin build` が成功 — vite production build clean
- [x] 12.4 `pnpm --filter @high-q/shared test` が pass — 48/48（`EventUpdate` 型追加 + 11 件型契約テスト）
- [x] 12.5 全 `*.vue` / `*.ts` で hex / rgb / rgba リテラル grep が 0 件 — event-form / event-delete / pages / shared/ui の新規ファイルすべて
- [ ] 12.6 admin で `/events/new` から実イベントを作成し、一覧反映を目視確認 → LP（あれば）で即時公開を確認。OK が出てから commit — **翔太郎くんの目視確認待ち**（Render プレビュー or ローカル `pnpm --filter @high-q/admin dev` で）
