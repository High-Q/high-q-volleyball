# Tasks: 会場マスタ CRUD（管理画面・マスター・ディテール B案）

> **設計ピボット（2026-06-17）**: 初版はデータテーブル + 別作成/編集ページ構成だったが、ユーザー提供プロトタイプ「会場マスタ B案」（claude.ai/design 由来、`docs/10-デザインサンプル/admin/会場マスタ B案.html` / `venue-app.jsx` / `venue-data.js`）に基づき **2 ペイン マスター・ディテール型**へ全面置き換え。テーブル版の widgets/venues-list・venue-form・features/venue-delete・create/edit ページ・関連ルートは削除済み。
>
> **データ写像の決定**（DB は migration なし）: feeType+fee↔default_fee / geo↔map_url / 郵便番号 zip→住所に統合（列なし）/ meeting_point は本画面に編集欄なし・更新時非送信で既存値保持。**色は HQ トークン（橙）に統一**（B案の緑は不採用・別 Issue 余地）。

## 1. Setup

- [x] 1.1 ブランチ `feature/151-admin-venues-crud-screen` を作成
- [x] 1.2 プロトタイプ（README / venue-app.jsx / venue-data.js / 会場マスタ B案.html）を取得・読込、`docs/10-デザインサンプル/admin/` に保存。既存 events-crud パターンも確認

## 2. entity: venue CRUD API（TDD・継続利用）

- [x] 2.1 `entities/venue/api/venueQueries.spec.ts`（RED）: fetch/create/update/delete + classifyError（23503→VENUE_IN_USE / 23505→DUPLICATE_NAME）
- [x] 2.2 `entities/venue/api/venueQueries.ts`（GREEN）: `Result<T, FetchError>`、`VenueUpdate` allowlist
- [x] 2.3 メイン会場の自動切替（D1）: is_primary=true 時「他の true を false→対象保存」順で適用
- [x] 2.4 `entities/venue/index.ts` に CRUD 関数・型を追記 export

## 3. model: 編集ドラフト VM（TDD）

- [x] 3.1 `widgets/venues-master-detail/model/venueDraft.spec.ts`（RED）: venueToDraft / draftToInsert / draftToUpdate / validateDraft / formatYmdJst
- [x] 3.2 `venueDraft.ts`（GREEN）: VM ↔ DB 写像（feeType↔default_fee / geo↔map_url / zip 統合 / meeting_point 非送信）、会場名必須・固定額金額必須(0以上整数)の検証

## 4. composable: マスター・ディテール状態（TDD）

- [x] 4.1 `widgets/venues-master-detail/composables/useVenuesMaster.spec.ts`（RED）: 読込/選択/検索/dirty ガード/新規/保存/削除/VENUE_IN_USE
- [x] 4.2 `useVenuesMaster.ts`（GREEN）: 一覧取得 + ドラフト編集 + dirty + 保存/削除/新規 + トースト。保存/削除後は refetch で一覧・メイン切替・最終更新を反映

## 5. UI

- [x] 5.1 `widgets/venues-master-detail/ui/VenuesMasterDetail.vue`: 2 ペイン（検索リスト / 詳細フォーム / フッター / トースト）。色は HQ トークン経由・生 hex なし。料金タイプ segment・地図プレビュー・メイントグル・4 状態
- [x] 5.2 `widgets/venues-master-detail/index.ts` で Public API を export
- [x] 5.3 `pages/VenuesPage.vue`: ヘッダー（パンくず + 横遷移リンク + ＋新しい会場 CTA + ログアウト）+ widget。CTA は widget.addVenue を呼ぶ

## 6. routing & ナビゲーション

- [x] 6.1 `app/router.ts`: `/venues`（name: `venues`）単一ルートに変更（/venues/new・/venues/:id/edit を廃止）。VenuesPage を import
- [x] 6.2 `pages/DashboardPage.vue` / `EventsListPage.vue` に「会場」リンクを双方向対称で追加（VenuesPage ヘッダーから各セクションへ戻れる）
- [x] 6.3 `app/router.spec.ts`: ルート総数を 13 に更新、`/venues` guard（非 admin 不可）テストを維持

## 7. 最終確認

- [x] 7.1 `pnpm -F admin exec vitest run` 全 green（945 passed・venueDraft 16 / useVenuesMaster 13 含む）
- [x] 7.2 lint（0 errors）/ typecheck / build / stylelint（0）/ depcruise（0 errors）
- [ ] 7.3 ローカル探索的試験: 一覧・検索・選択・新規・編集・固定/都度切替・メイン自動切替・削除（未参照）・参照中削除拒否・dirty ガード・4 状態・モバイル縦積み・キーボード操作
- [ ] 7.4 PR 作成・CI 通過確認（`gh pr checks --watch`）

---

## 備考・ブロッカー

- DB / RLS / GRANT は MVP1 完備のため migration なし
- **要確認**: B案に集合場所(meeting_point)欄が無い。本実装では欄を出さず既存値を保持（更新時非送信）。reservation 側 spec が #151 へ委譲しているため、編集欄が必要なら別途追加可
- B案の緑パレットは不採用（HQ 橙トークンで統一）。将来ブランド緑化するなら design-tokens レベルの別 Issue
