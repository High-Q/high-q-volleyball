## 1. 縦読み系ページの最外枠・本文ラッパーを是正

各ページの最外枠 `flex h-screen flex-col` → `flex min-h-screen flex-col md:h-screen`、本文ラッパー `flex-1 overflow-hidden` → `flex-1 md:overflow-hidden` に変える（デスクトップ挙動は不変）。

- [x] 1.1 `pages/EventDetailPage.vue`（最外枠 L45 / 本文ラッパー L57）を是正する
- [x] 1.2 `pages/EventsListPage.vue`（L19 / L30）を是正する
- [x] 1.3 `pages/MembersListPage.vue`（L47 / L64）を是正する
- [x] 1.4 `pages/IdentityDocumentsListPage.vue`（L18 / L29）を是正する
- [x] 1.5 `pages/IdentityDocumentDetailPage.vue`（L31 / L46）を是正する

## 2. 参加者一覧の入れ子枠とツールバーを是正

- [x] 2.1 `widgets/event-detail/ui/EventDetailWidget.vue` のタブパネル `flex-1 overflow-hidden flex flex-col`（participants L163 / wait L179）を `flex-1 md:overflow-hidden flex flex-col` に変える
- [x] 2.2 `widgets/event-participants/ui/EventParticipantsWidget.vue` のスクロール領域 `flex-1 overflow-auto px-hq-8 pt-hq-3`（L142）を `flex-1 md:overflow-auto px-hq-8 pt-hq-3` に変える
- [x] 2.3 `widgets/event-participants/ui/EventParticipantsToolbar.vue`（L66〜）をモバイルで縦積みにする：ルートを `flex flex-col gap-hq-3 ... md:flex-row md:flex-wrap md:items-center`、検索ボックス `w-60` → `w-full md:w-60`、各 `SelectTrigger`（`w-32` / `w-40`）を `w-full md:w-32` / `w-full md:w-40` に変える

## 3. 会場マスタ（マスター・ディテール）を是正

- [x] 3.1 `pages/VenuesPage.vue` の最外枠（L28）と本文ラッパー `flex-1 overflow-hidden px-hq-6 py-hq-6 md:px-hq-8`（L57）を `min-h-screen md:h-screen` / `flex-1 md:overflow-hidden ...` に変える
- [x] 3.2 `widgets/venues-master-detail/ui/VenuesMasterDetail.vue` の 2 ペインカード `grid min-h-0 flex-1 overflow-hidden ...`（L58）を `grid flex-1 md:min-h-0 md:overflow-hidden ...` に、左ペイン一覧 `flex-1 overflow-y-auto`（L82）と詳細フォーム `flex-1 overflow-y-auto`（L179）を `flex-1 md:overflow-y-auto` に変える（デスクトップ 2 ペイン固定スクロールは不変）

## 4. テストと最終確認

- [x] 4.1 キャンセル待ちタブ `EventWaitlistPanel`（参加者一覧と対称な内側スクロール領域 `flex-1 overflow-auto`）も `flex-1 md:overflow-auto` に是正する（design D2 の連鎖解除。E2E は admin の認証制約で認証後画面に到達不可のため追加せず、検証は component テスト + 4.4 手動目視に委ねる）
- [x] 4.2 `EventParticipantsToolbar` のモバイル縦積み（全幅・縦並び、md 以上で横並び・固定幅）を確認する Component テストを追加する
- [x] 4.3 `apps/admin/src/pages` / `widgets` を `overflow-hidden` / `overflow-auto` で grep し、対象箇所すべてに `md:` が付き素の固定枠が残っていないことを確認する
- [x] 4.4 `pnpm exec vitest run`（admin 範囲）と admin ビルドを一括実行し、375 / 768 / 1280px で対象 6 ページが横スクロールなしで表示・スクロールできることを目視確認する
