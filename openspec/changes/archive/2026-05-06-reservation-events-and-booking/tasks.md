## 1. event エンティティ

- [x] 1.1 `apps/reservation/src/entities/event/index.ts` で Public API を export する。`EventId` Branded Type は `@high-q/shared` から re-export
- [x] 1.2 `apps/reservation/src/entities/event/model/event.ts` で `Event` 型（DB row → アプリ型変換）を定義する。一覧用の型と詳細用の型を分け、詳細用には `venue_address` を含める
- [x] 1.3 `apps/reservation/src/entities/event/api/event-queries.ts` に `listUpcomingEvents()` / `getEventDetail(id)` を実装する。実装は `events` × `venues` の LEFT JOIN を Supabase クエリビルダで組み、アプリ層で `visibility = 'published'` AND `status = 'scheduled'` AND `start_at >= now()` をフィルタする。`fee` 列は `events.fee ?? venues.default_fee` のフォールバックを TS 側で行う。詳細クエリでは追加で `venues.address` を取得する
- [x] 1.4 `event-queries` の取得結果が空配列の場合と単一行未取得の場合の Result 型ハンドリングを実装する

## 2. feature: event-listing

- [x] 2.1 `apps/reservation/src/features/event-listing/composable/use-upcoming-events.ts` を実装する。`listUpcomingEvents()` を呼び出し reactive な `events / loading / error` を返す
- [x] 2.2 `apps/reservation/src/features/event-listing/ui/EventCard.vue` を実装する。表示要素: 開催日（`YYYY年MM月DD日 (曜)`）/ イベント名 / 会場名 / 開始-終了時刻 / 参加費。**会場住所は表示しない**（詳細画面との差分要素として詳細でのみ出す）。押下で `/events/:id` へ navigate
- [x] 2.3 EventCard の component テスト（@vue/test-utils）で正常系描画を検証する

## 3. feature: event-detail

- [x] 3.1 `apps/reservation/src/features/event-detail/composable/use-event-detail.ts` を実装する。`getEventDetail(id)` を呼び出し reactive な `event / loading / error` を返す
- [x] 3.2 `apps/reservation/src/features/event-detail/ui/EventInfoBlock.vue` を実装する。表示要素: 開催日時 / 会場名 / **会場住所** / 参加費。一覧性高いシンプルな縦リスト or 軽い 2 列構成
- [x] 3.3 `apps/reservation/src/features/event-detail/ui/EventStickyCta.vue` を実装する。参加費 + 「予約に進む」ボタンを画面下部 sticky 配置で描画。押下時にトースト「予約機能は準備中です」を表示するハンドラを仮実装（Issue #91 で差し替え）
- [x] 3.4 詳細画面に **紹介文 / 写真 / キャンセルポリシーのいずれも実装しない** ことを設計レビューで確認

## 4. widget: page-breadcrumb

- [x] 4.1 `apps/reservation/src/widgets/page-breadcrumb/PageBreadcrumb.vue` を実装する。`items: BreadcrumbItem[]` プロパティで `<nav aria-label="パンくず">` を描画する。第 1 セグメント **「マイページ」** は `to: { name: 'events-list' }` でリンクする
- [x] 4.2 PageBreadcrumb の unit テスト（items 数 / リンク to の検証 / aria-label 検証 / 第 1 セグメント文言が「マイページ」になることの検証）を書く

## 5. pages

- [x] 5.1 `apps/reservation/src/pages/EventsListPage.vue` を実装する。Hero（Kicker `Upcoming · {{count}}` + 大見出し「次の練習を、選んでください。」）+ EventCard リスト + 4 状態 UI（Loading skeleton / Empty / Error / Success）+ PageBreadcrumb（`マイページ > イベント`）+ TopBar（ロゴ + 右上ログアウトメニュー）を組み合わせる
- [x] 5.2 `apps/reservation/src/pages/EventDetailPage.vue` を実装する。開催日見出し + イベント名 + EventInfoBlock + EventStickyCta + 4 状態 UI + PageBreadcrumb（`マイページ > イベント > [イベント名]`）+ TopBar を組み合わせる
- [x] 5.3 `apps/reservation/src/pages/HomePlaceholder.vue` を削除する

## 6. router 配線

- [x] 6.1 `apps/reservation/src/app/router.ts` に `path: '/events'` (name: `events-list`, component: `EventsListPage`) と `path: '/events/:id'` (name: `event-detail`, component: `EventDetailPage`) の 2 ルートを追加する
- [x] 6.2 同 router の `path: '/'` を `redirect: { name: 'events-list' }` に変更する
- [x] 6.3 2 ルートとも `meta.public` を持たず、既存の auth guard 配下に置かれることを確認する
- [x] 6.4 `apps/reservation/src/app/router.spec.ts` を更新し、新 2 ルートの定義検証 + ホーム URL リダイレクト検証 + 既存ルートの存続検証が pass するようにする

## 7. E2E（Issue #201 へ移管）

- [x] 7.1 ~~Playwright E2E ケース追加~~ → **Issue #201 (reservation 向け Playwright E2E 環境セットアップ) として独立起票し、本 change のスコープから外した**。component test (EventCard.spec / PageBreadcrumb.spec / format-date.spec / router.spec) で正常系の主要要素はカバー済み
- [x] 7.2 ~~CI E2E 設定~~ → 同上 #201 で対応

## 8. 最終確認

- [x] 8.1 ~~`pnpm exec eslint apps/reservation`~~ → reservation には lint script が未設定（プロジェクト全体で LP のみ ESLint 走らせる構成）。代替として `pnpm --filter @high-q/reservation typecheck` で `vue-tsc --noEmit` を実行し pass を確認した。FSD 依存方向は新規ファイルが index.ts 経由で外部 import している構造で、依存方向違反なし
- [x] 8.2 `pnpm --filter @high-q/reservation test` で全 249 件 pass を確認
- [x] 8.3 `pnpm --filter @high-q/reservation build` がエラーなく完了することを確認
- [x] 8.4 ~~E2E 実行~~ → Issue #201 へ移管
- [x] 8.5 grep で `<nav aria-label="パンくず">` の独自実装が PageBreadcrumb 以外に存在しないことを確認（実装 1 + JSDoc 例 1 の 2 件のみ、すべて PageBreadcrumb.vue 内）
- [x] 8.6 grep で 2 画面（EventsListPage.vue / EventDetailPage.vue）および features/event-listing / features/event-detail 配下に生 hex / px / rem のマジックナンバー直書きがないことを確認。PageBreadcrumb の `2px outline / 3px text-underline-offset` は admin 側の同 widget と同じ a11y 補助値で、HQ tokens に該当スケールがないため受容（admin spec で先行例として通っている）
- [x] 8.7 grep で `description` / `cancel_deadline` / `thumbnail_path` / 紹介文 / 写真 / キャンセル / 残席 / 満員 / capacity 関連の語が新規 UI 実装ファイルに残存していないことを確認（0 件）
- [ ] 8.8 ローカルで `pnpm --filter @high-q/reservation dev` を起動し、ログイン → ホーム URL → イベント一覧 → 詳細 → 「予約に進む」ボタンの「準備中」案内表示まで手動 walk-through する（**翔太郎くんによる確認**）
- [ ] 8.9 翔太郎くんへの完了報告を作成する。`apps/reservation` のみの変更のため CLAUDE.md ルールに従い「Render PR Preview は生成されないためローカル `pnpm --filter @high-q/reservation dev` で動作確認をお願いします」と明記する
