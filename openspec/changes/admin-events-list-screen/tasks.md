# Tasks: admin-events-list-screen

> 進捗: 0 / N
> 各タスクは TDD（RED→GREEN→REFACTOR）。CLAUDE.md の Apply ルール（UI 変更連続時は最終確認タスクで一括テスト実行）に従う。

## 1. Setup（DB migration + shadcn-vue プリミティブ取り込み）

- [x] 1.1 SQL migration ファイル `supabase/migrations/20260430120000_event_list_view.sql` を新規作成し、`event_list_view`（`SECURITY INVOKER`、events × venues LEFT JOIN + reservations の `LATERAL` サブクエリで `reserved_count` 集計、`fee` を `COALESCE(events.fee, venues.default_fee)` で正規化）を定義 + `REVOKE FROM anon` / `GRANT SELECT TO authenticated` を含める
- [ ] 1.2 ローカル supabase（`pnpm supabase start`）で migration を apply し、`select * from event_list_view limit 5` が events / venues / reservations テスト fixture に対して期待どおりの行を返すことを SQL Editor で確認 — **本リポジトリは supabase CLI 未配備のため、Supabase Dashboard SQL Editor 経由で apply。10.8 の実機確認と合わせて翔太郎くんが実施**
- [x] 1.3 `apps/admin` 配下で `pnpx shadcn-vue@latest add table select skeleton --yes`（または手動 copy-paste、設定差異で CLI が動かない場合）を実行し、`apps/admin/src/shared/ui/` 配下に `Table.vue`（+ サブコンポーネント `TableHeader` / `TableBody` / `TableRow` / `TableHead` / `TableCell` / `TableCaption`）/ `Select.vue` / `Skeleton.vue` を配置 — 手動 copy-paste で実施。Select は radix-vue ベースで `Select` / `SelectTrigger` / `SelectValue` / `SelectContent` / `SelectItem` の 5 ファイル
- [x] 1.4 取り込んだプリミティブの色・spacing 指定を Tailwind preset utility（`bg-paper` / `text-ink` / `border-hairline` / `p-hq-*` 等）または `var(--hq-*)` 経由に置換する。リテラル hex / rgb / 任意値クラスの混入が無いことを目視 + grep で確認 — 全ファイルが HQ utility 経由で着色済み（[var(--radix-select-trigger-height)] のような radix の CSS 変数のみ任意値クラス、これは radix-vue の API 経由で必須）
- [x] 1.5 `Table.spec.ts` / `Select.spec.ts` / `Skeleton.spec.ts` のスモークテスト（基本レンダリング + props 反映）を書く。`pnpm --filter @high-q/admin test` で pass する — 33/33 pass
- [x] 1.6 `apps/admin/src/shared/ui/index.ts` に取り込んだプリミティブを export 追加

## 2. Domain: entities/event（型 + ヘルパー、TDD）

- [x] 2.1 `apps/admin/src/entities/event/model/event.types.ts` に `EventListRow`（view DTO 型、`EventId` / `VenueId` Brand を `@high-q/shared` から import）/ `DisplayStatus` / `Period` / `SortKey` / `SortDir` 型を定義
- [x] 2.2 `apps/admin/src/entities/event/model/event.types.spec.ts` に `resolveDisplayStatus(row, now)` のテストを RED で書く: `status='cancelled'` → `'cancelled'`、`status='closed'` → `'closed'`、`end_at < now` で `'closed'` 上書き、それ以外は `visibility` を返す（`'published'` / `'draft'` / `'private'`）
- [x] 2.3 `resolveDisplayStatus` を実装し 2.2 を pass させる
- [x] 2.4 `apps/admin/src/entities/event/model/event.types.spec.ts` に表示ヘルパー `formatDateLabel(start_at)`（`YYYY/MM/DD (曜)`）/ `formatTimeRange(start_at, end_at)`（`HH:mm-HH:mm`）/ `translateVisibility('published'|'draft'|'private')`（`'公開中'|'下書き'|'限定公開'`） のテストを RED で書き、実装する — 13/13 pass
- [x] 2.5 `apps/admin/src/entities/event/index.ts` で型・ヘルパーを export

## 3. Domain: entities/event API layer（TDD + MSW）

- [x] 3.1 `apps/admin/src/entities/event/api/eventQueries.spec.ts` を書く（MSW で Supabase REST モック）: `fetchEventsList(filter)` が `event_list_view` を SELECT し、`filter.period` / `filter.venue` / `filter.status` / `filter.search` / `filter.sort` / `filter.page` を WHERE / ORDER BY / LIMIT / OFFSET にマップすること、`Result<EventListRow[], FetchError>` を返すこと、ネットワーク失敗で `NETWORK_ERROR`、5xx で `SERVER_ERROR`、403 で `PERMISSION_DENIED` を返すこと、空配列で `Ok([])` を返すこと — chainable mock builder で実装、16/16 pass
- [x] 3.2 `apps/admin/src/entities/event/api/eventQueries.ts` を実装し 3.1 を pass させる。`fetchEventsList(filter)` / `EventsListFilter` 型 / `FetchError` 型を export。Supabase クライアントは `apps/admin/src/shared/api/supabase.ts` の singleton を使用
- [x] 3.3 `entities/event/index.ts` で `fetchEventsList` / `EventsListFilter` / `FetchError` を export

## 4. Feature: features/events-filter（TDD）

- [x] 4.1 `apps/admin/src/features/events-filter/types.ts` に `FilterState`（period / venue / status / search / sort / dir / page）の型を定義
- [x] 4.2 `apps/admin/src/features/events-filter/composables/useEventsFilter.spec.ts` を書く（vue-router の `createMemoryHistory` でテスト） — 12/12 pass
- [x] 4.3 `apps/admin/src/features/events-filter/composables/useEventsFilter.ts` を実装し 4.2 を pass させる。`filter` (computed) / `setPeriod` / `setVenue` / `setVisibility` / `setSearch` / `setSort` / `setPage` / `reset` / `isFiltered` (computed) を expose
- [x] 4.4 `features/events-filter/index.ts` で `useEventsFilter` / `FilterState` を export

## 5. Widget: shared 子コンポーネント（TDD・先に状態系を作る）

- [x] 5.1 `apps/admin/src/widgets/events-list/ui/EventsTableSkeleton.vue` を実装。`Skeleton` プリミティブで 6 行 × 8 列の skeleton bar を描画。`EventsTableSkeleton.spec.ts` に「6 行表示される」「DataTable のヘッダは表示されている」のテスト
- [x] 5.2 `EventsEmptyState.vue` を実装。props: `isFiltered: boolean`。フィルタ未設定 → 「イベントがまだありません」+ 「新規作成」CTA、フィルタ設定済み → 「該当するイベントがありません」+ 「フィルタをリセット」CTA。`EventsEmptyState.spec.ts` に出し分け + CTA emit のテスト
- [x] 5.3 `EventsErrorState.vue` を実装。props: `errorCode: 'NETWORK_ERROR'|'SERVER_ERROR'|'PERMISSION_DENIED'`、emit: `retry`。`role="alert"`、`ERR · supabase / events.list · {code}`、再試行 CTA。`EventsErrorState.spec.ts` に `role="alert"` 付与 + コードごとの文言出し分け + retry emit のテスト
- [x] 5.4 `EventsToolbar.vue` を実装。props: `filter: FilterState` / `venues: { id: VenueId, name: string }[]`、emit: `update:search` / `update:period` / `update:venue` / `update:visibility` / `clickNew`。検索 input + 期間 / 会場 / ステータス Select + 「新規作成」`Button`
- [x] 5.5 `EventsPagination.vue` を実装。props: `page: number` / `total: number` / `per: number`、emit: `update:page`。前/次/ページ番号リンク表示
- [x] 5.6 `EventsTable.vue` を実装。props: `rows: EventListRow[]` / `sort: SortKey` / `dir: SortDir`、emit: `update:sort`。8 列の DataTable + aria-sort + capacity NULL fallback + ステータス Badge + 操作リンク — 32/32 pass

## 6. Widget: 統合（4 状態出し分け、TDD）

- [x] 6.1 `apps/admin/src/widgets/events-list/composables/useEventsListData.ts` を実装。`useEventsFilter` と `fetchEventsList` を組み合わせ、`data` / `total` / `isPending` / `isError` / `errorCode` / `refetch` を expose。filter 変更で自動 refetch、debounce 200ms（検索 input 入力時の連打抑制）
- [x] 6.2 `useEventsListData.spec.ts` を書く — 7/7 pass、debounce / filter 変更 / refetch を網羅
- [x] 6.3 `EventsListWidget.vue` を実装。`useEventsListData` + `useVenues` を組み合わせ、4 状態を出し分ける
- [x] 6.4 `EventsListWidget.spec.ts` に 4 状態の出し分けテストを追加 — 7/7 pass
- [x] 6.5 `widgets/events-list/index.ts` で `EventsListWidget` を export

## 7. Page + Router

- [x] 7.1 `apps/admin/src/pages/EventsListPage.vue` を実装。レイアウト枠（HQ paper 背景・font-jp）+ `EventsListWidget` のマウント + ページタイトル「イベント」のヘッダ + ログアウトボタン — 3/3 pass
- [x] 7.2 `apps/admin/src/pages/EventsNewPage.vue`（プレースホルダ）を実装。"#86 で実装" のメッセージ + 「一覧に戻る」リンク — 1/1 pass
- [x] 7.3 `apps/admin/src/app/router.ts` を更新: `/events` / `/events/new` ルート追加、`/` は `redirect: { name: 'events' }` に変更。guard の `name: 'home'` も `name: 'events'` に置換 — 16/16 pass（既存 7 + 新規 5 + 既存 routes 数 1 + 新規 1 + 既存 meta.public 1）
- [x] 7.4 `HomePlaceholder.vue` の取り扱い: router 定義から外し、ファイル本体は履歴互換で残す。Sync で削除する旨のコメントを冒頭に追加

## 8. Supabase 型 / クエリ実装の動作確認

- [x] 8.1 Supabase クライアントは既存リポジトリで `Database` 型ジェネリクスを使用していないため、`from('event_list_view')` を string で呼び出し、戻り値を `EventListRow[]` に明示キャストする方針で型整合を取った。typecheck pass 確認済
- [ ] 8.2 ローカル admin（`pnpm --filter @high-q/admin dev`）で実機接続を確認 — **翔太郎くんの実機確認に依頼。10.8 と合わせて実施**

## 9. E2E（Playwright、上限 2 件）

- [x] 9.1 `e2e/admin/events-list.e2e.ts` に「未認証で /events → /login redirect」の E2E を 1 件追加 — pass。CLAUDE.md「肥大化したら component test に押し下げる」ルールに従い、認証済 admin の Happy path と Filter 適用は component test (vitest 48 件) で網羅した
- [x] 9.2 Filter 適用 E2E は component test に押し下げ済 — `useEventsFilter.spec.ts` (12 件) で URL クエリ同期を、`EventsToolbar.spec.ts` (5 件) で UI 操作 → emit を、`useEventsListData.spec.ts` (7 件) で filter 変更 → fetch + debounce を網羅
- [x] 9.3 `mockEventsList` / `mockVenues` ヘルパーは本 change の E2E では未使用のため作成しない。後続 Issue で認証済セッションの E2E を追加する際に併せて実装

## 10. 品質確認・最終チェック（一括実行）

- [x] 10.1 マジックナンバー grep 確認 → 0 件（admin/widgets / features / entities / pages すべて HQ utility 経由）
- [x] 10.2 `reservations` 直接 SELECT grep 確認 → 0 件（`event_list_view` 単一クエリ契約遵守）
- [x] 10.3 `pnpm --filter @high-q/admin typecheck` pass
- [x] 10.4 `pnpm --filter @high-q/admin test` pass — 228/228（既存 168 + 本 change 60 件追加）
- [x] 10.5 `pnpm --filter @high-q/admin build` pass — 1.16s
- [x] 10.6 Playwright E2E pass — admin 3/3（既存 2 + 新規 1）
- [ ] 10.7 アクセシビリティ手動確認 — 翔太郎くん実機で Tab / Enter / Space / 方向キー / Esc 操作確認に依頼
- [ ] 10.8 ローカル実機確認（翔太郎くん）: ログイン → `/` が `/events` に redirect → 一覧表示 → フィルタ・検索・ソート・ページ送り → Empty / Error の人為的再現 → 「新規作成」CTA で `/events/new` に遷移できる + T1.2 `event_list_view` migration を Supabase Dashboard で apply

## 11. ドキュメント・運用準備（Sync フェーズ向けメモ）

- [x] 11.1 Sync 候補リスト確定（実反映は Sync フェーズ）:
  - `openspec/specs/admin-events-list/spec.md` を本 change の `specs/admin-events-list/spec.md` から新規生成
  - `openspec/specs/app-routing/spec.md` を ADDED delta 反映（`/events` / `/events/new` / `/` redirect）
  - `openspec/specs/shadcn-vue-integration/spec.md` を MODIFIED 反映（Table / Select / Skeleton 累積リストに追加）+ ADDED 反映（新規プリミティブのスモークテスト要件）
  - `openspec/specs/data-schema/spec.md` を ADDED 反映（`event_list_view` 定義）
  - `openspec/specs/rls-policies/spec.md` を ADDED 反映（`event_list_view` の admin アプリ呼び出し契約）
  - `docs/05-インターフェース/01-UI設計方針.md` に DataTable の 4 状態 + RemainBar capacity NULL fallback 例を追記
  - `apps/admin/src/pages/HomePlaceholder.vue` + `HomePlaceholder.spec.ts` の削除（router から外し、Sync で実体削除）

## 12. 後続 change（本 change の範囲外、別 Issue）

- [ ] 12.1 #86: `/events/new` / `/events/:id/edit` のフォーム実装（プレースホルダの実体化）
- [ ] 12.2 #87: `/events/:id` 詳細画面 + 行クリックでの遷移
- [ ] 12.3 別 Issue: モバイルレイアウト / カレンダービュー / CSV エクスポート / 一括公開 / 過去から複製
