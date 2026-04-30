# Proposal: admin イベント一覧画面

> Issue: #85
> Epic: #167（オーナーがイベントを公開する）
> 関連: #84（admin Login 完了済）/ #86（イベント編集 — 後続）/ #173（DB スキーマ完了済）

## Why

admin にログインできるようになった（#84 完了）が、ログイン後のホームは "準備中" プレースホルダのままで、オーナーは現実のイベントを管理できない。Epic #167 のユーザージャーニー第 2 ステップ（過去・今後の予定を確認する）を実現するには、events を一覧表示し、フィルタ/ソート/検索/残席状況を一目で把握できる DataTable 画面が必要。本画面は #86（編集フォーム）への入口でもあり、admin 機能群の起点となる。

## What Changes

- **NEW**: `apps/admin/src/pages/EventsListPage.vue` — `/events` ルート（既存 `/` プレースホルダを置換）
- **NEW**: `apps/admin/src/widgets/events-list/` — DataTable + Toolbar + Pagination の複合 widget
- **NEW**: `apps/admin/src/features/events-filter/` — 期間/会場/ステータス filter + タイトル/会場 search + sort 状態を URL クエリ同期で管理する composable
- **NEW**: `apps/admin/src/entities/event/` — `Event` ドメイン型（既存 Branded Types `EventId`/`VenueId` を再利用）と Supabase クエリ層（残席数 + 会場名を join した list query）
- **NEW**: `apps/admin/src/shared/ui/` に shadcn-vue から `Table` / `Select` / `Skeleton` プリミティブを copy-paste で取り込み、Tailwind preset utility 経由で着色（CLAUDE.md Pillar 3 の機能系プリミティブ棲み分けに従う）
- **NEW**: SQL view `event_list_view`（events × venues join + reservations の `status='reserved'` COUNT を `reserved_count` 列として返す）+ RLS（admin のみ SELECT 可）。集計ロジックを DB に閉じ込め、admin クライアントは単一クエリで取得できる
- **MODIFIED**: `apps/admin/src/app/router.ts` — `/events` ルート追加、`/` を `/events` へ redirect、`HomePlaceholder` のサインアウトボタン配置を再考（widget の Toolbar 側へ移設）
- **MODIFIED**: `openspec/specs/shadcn-vue-integration/spec.md` — admin で取り込み済みプリミティブに Table / Select / Skeleton を追加
- **MODIFIED**: `openspec/specs/app-routing/spec.md` — admin の `/events` 認証下ルートを追加
- **MODIFIED**: `openspec/specs/data-schema/spec.md` — `event_list_view` の追加 Requirement
- **MODIFIED**: `openspec/specs/rls-policies/spec.md` — `event_list_view` の SELECT ポリシー（admin のみ）

## Capabilities

### New Capabilities

- `admin-events-list`: admin の `/events` 画面の責務を定義する（DataTable 列構成 / フィルタ・検索・ソート契約 / 4 状態 / 残席バー表示 / 「新規作成」CTA / ページネーション / URL クエリ同期）

### Modified Capabilities

- `app-routing`: `/events` ルートを admin ルート定義に追加し、`/` から `/events` への redirect を規定する
- `shadcn-vue-integration`: admin の取り込み済みプリミティブ一覧に `Table` / `Select` / `Skeleton` を追加する
- `data-schema`: `event_list_view`（events × venues × reservations 集計）の追加要件
- `rls-policies`: `event_list_view` の RLS（admin のみ SELECT）の追加要件

## Non-Goals

本 change のスコープ外（Issue #85 で明示的に MVP2 押し下げ、または別 Issue）:

- カレンダービュー（独立 Issue）/ 過去から複製 / 一括公開・終了 (bulk actions) / CSV エクスポート
- 行選択チェックボックス（bulk actions 用なので不要）
- 編集ページ（#86）/ 削除実装（別 Issue）/ 詳細画面遷移
- 会場マスタ・ステータスマスタの編集 UI
- モバイルレイアウト（1280px desktop 主、モバイルは MVP2）
- 「過去から複製」「テンプレートから」CTA（デザインサンプルにあるが Non-Goal）
- 公開後の Toast 表示（編集 #86 で実装。一覧側は表示先のみ）

## Impact

### 影響するコンポーネント・ファイル

- `apps/admin/src/`
  - `pages/EventsListPage.vue`（NEW）/ `pages/HomePlaceholder.vue`（DELETE or `/events` への redirect 実装に置換）
  - `widgets/events-list/`（NEW: `EventsListWidget.vue` / `EventsTable.vue` / `EventsToolbar.vue` / `EventsPagination.vue` / `EventsEmptyState.vue` / `EventsErrorState.vue`）
  - `features/events-filter/`（NEW: `useEventsFilter.ts` / `types.ts` / `index.ts`）
  - `entities/event/`（NEW: `model/event.types.ts` / `api/eventQueries.ts` / `index.ts`）
  - `shared/ui/`（NEW: shadcn-vue から `Table.vue` / `Select.vue` / `Skeleton.vue` を copy-paste）
  - `app/router.ts`（MODIFIED: `/events` ルート追加 + `/` redirect）
- DB
  - migration: `event_list_view` view 作成 + RLS ポリシー（admin SELECT のみ）
- 仕様書
  - `openspec/specs/shadcn-vue-integration/spec.md` / `app-routing/spec.md` / `data-schema/spec.md` / `rls-policies/spec.md` を Sync で更新

### 依存関係

- 新規 npm 依存: なし（shadcn-vue は既存、radix-vue で Table 系も賄える）
- 既存利用: `@high-q/ui` の `RemainBar` / `Button` / `Kicker` / `Badge`、`@high-q/shared` の Branded Types / Result 型 / Supabase client、`@high-q/tailwind-preset`

### 後続 Issue への効果

- #86（イベント編集フォーム）: 「新規作成」CTA / 行クリックの遷移先として `/events/new` / `/events/:id/edit` を本 change で route 予約しておく（実装は #86 で）
- #87（イベント詳細・公開状態管理）: 行クリックで `/events/:id` 詳細ルートへ。本 change ではプレースホルダも作らず、`/events/:id` ルートはまだ追加しない
