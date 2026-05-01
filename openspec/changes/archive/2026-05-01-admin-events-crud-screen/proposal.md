## Why

Issue #85 (admin-events-list) で **一覧・閲覧** は完成したが、admin はまだ **「イベントを作成・編集・削除する手段」を持たない**。Epic #167「オーナーがイベントを公開する」のコア責務は CRUD であり、これが揃わないと LP / 予約サイトに表示するイベントは seed データに頼らざるを得ない。

Issue #86 の本文は 5 セクション構成（基本情報 / 募集要項 / 紹介文 / サムネイル / 公開設定）の網羅的なフォームを要求しているが、**MVP1 で admin が必要な最小限はサークルの「いつ・どこで・いくらで・何人まで」を素早く登録できること**だと整理し、残り 3 セクションは MVP2 に押し下げる。下書き / 限定公開などの公開状態切替も MVP2 とし、本 change では「**登録 → 即時表示 / 削除 → 即時非表示**」の単純運用に絞る。

## What Changes

- 管理画面に **`/events/new`（新規作成）** と **`/events/:id/edit`（編集）** の 2 画面を追加
- フォームは **1 セクション構成**（`FormSection` 1 つだけマウント）:
  - **01 基本情報**: タイトル / 開催日 / 開始時刻 / 終了時刻 / 会場 / 参加費
- 新規 / 既存どちらでも 1 つの `EventForm` を `mode: 'create' | 'edit'` props で使い回す
- INSERT 時は `events.visibility = 'published'` で固定投入し、保存と同時に LP / 予約サイトに公開される（即時表示）
- 「保存」ボタン 1 つに統一（Create / Edit ともに）
- 削除は **AlertDialog による二重確認**（タイトル一致タイプは MVP2、ボタン 2 段階で十分）。削除すると一覧からも公開画面からも即時に消える
- バリデーション: 必須項目 / 開始 < 終了 / fee >= 0
- 4 状態（Loading / Empty / Error / Success）を網羅。Edit 画面の Loading は Skeleton、保存中は Button の loading 表示、Error は Banner と inline、Success は Toast
- shadcn-vue から **`AlertDialog` / `Toast`** を `apps/admin/src/shared/ui/` に取り込む（Login / Events List で取り込んだ Input / Label / FormField / Select / Table / Skeleton の延長）
- 「ゆる練 vol.XX」テンプレ補完: 過去 events から最新 vol.NN を抽出し vol.NN+1 を初期値として提示（取得失敗時は補完なし）
- 一覧画面（#85）の「新規作成」CTA と行操作の「編集」リンクを実画面へ接続（プレースホルダ解除）
- **MVP2 押し下げ**: 定員 / 紹介文 / サムネイル画像 / キャンセル期限 / 下書き保存 / 限定公開 / 過去から複製 / プレビュー画面 / 会場 inline 追加 / Markdown プレビュー / タイトル一致タイプの削除確認

## Capabilities

### New Capabilities
- `admin-events-crud`: admin の `/events/new` と `/events/:id/edit` 画面の責務（2 セクション構成 / バリデーション / 4 状態 / 削除確認 / FSD 配置 / 即時公開ポリシー）

### Modified Capabilities
- `shadcn-vue-integration`: 取り込み対象に AlertDialog / Toast を追加（既存リストへの追補。Textarea / RadioGroup / Button は本 change で取り込まない）
- `admin-events-list`: 一覧画面の「新規作成」CTA と行「編集」リンクを `/events/new` / `/events/:id/edit` への実遷移に切替（プレースホルダ解除）

> 本 change では `events.thumbnail_path` 列追加 / Storage バケット `event-thumbnails` / Storage RLS は **不要**（サムネ機能を MVP2 に押し下げたため）。`data-schema` と `rls-policies` への変更は無し。

## Impact

- **DB Migration**: 不要（既存 events スキーマで十分。`visibility` は CHECK 制約済みで `'published'` を投入するだけ）
- **コード**:
  - `apps/admin/src/pages/`: `EventCreatePage.vue` / `EventEditPage.vue` 追加、Vue Router にルート追加
  - `apps/admin/src/widgets/event-form/`: `EventForm.vue` / `FormSection.vue` / `SectionBasic.vue` / `useEventForm`（state + 送信）/ `useVolumeSuggest`（vol.XX 補完）/ `eventFormSchema`（純関数バリデーション）
  - `apps/admin/src/features/event-delete/`: `useEventDelete` + `EventDeleteDialog.vue`（AlertDialog）
  - `apps/admin/src/entities/event/api/`: `createEvent` / `updateEvent` / `deleteEvent` / `getEventById` を `eventQueries.ts` に追加（既存 `fetchEventListPage` と同居）
  - `apps/admin/src/shared/ui/`: AlertDialog / Toast 関連をコピー追加
  - `packages/shared/src/types/entities.ts`: 既存 `EventInsert` で十分。新規 `EventUpdate` 型のみ追加
- **テスト**:
  - Component test: バリデーション関数 / FormSection / EventForm（4 状態）/ EventDeleteDialog
  - Integration test: useEventForm の create / update / delete サイクル（MSW）
  - E2E（1〜2 件上限）: ① 新規作成 happy path（必須項目入力 → 保存 → 一覧で公開中表示）、② 削除 edge case（AlertDialog で「削除する」を 2 回押下 → 一覧から消える）
- **影響を受ける既存機能**:
  - `apps/admin/src/widgets/events-list/`: 「新規作成」CTA / 行「編集」を実遷移に変更（軽微）
  - `apps/admin/src/app/router.ts`: ルート 2 件追加
- **無関係なまま**:
  - LP / reservation アプリ（events を読むだけ。`visibility = 'published'` で投入されるため即時に公開対象になる）
  - `events.description` / `events.cancel_deadline` / `events.capacity` / `events.thumbnail_path`（列は将来の拡張余地として残るが、本 change では `NULL` で投入）
