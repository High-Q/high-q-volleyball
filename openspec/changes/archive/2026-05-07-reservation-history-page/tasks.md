# Tasks: 予約履歴画面 `/history` の独立化

> 1 タスク = 1 コミット 原則。UI フィードバック対応など小粒な集合は最後に bundle 可。
> ロジック追加・spec 新設・バグ修正再発防止は TDD で各タスク内テスト実行。UI 変更タスク連続時は最終確認タスクで 1 回まとめてテスト/ビルド実行。

## 1. ルーティング & ページ雛形

- [x] 1.1 `apps/reservation/src/pages/HistoryPage.vue` を雛形（HQ paper 背景 + ヘッダ枠 + 空コンテナ + AppFooter）で作成
- [x] 1.2 `apps/reservation/src/app/router.ts` に `path: '/history'` / `name: 'history'` / `component: HistoryPage` を追加（`meta.public` なし）
- [x] 1.3 `apps/reservation/src/app/router.spec.ts` に `/history` の guard ルートテスト 4 件を追加（未認証 → `/login` / 未完成 → `/signup/profile` / 書類未提出 → `/signup/identity` / 全完了 → HistoryPage 描画）
- [x] 1.4 `widgets/page-breadcrumb/PageBreadcrumb` を HistoryPage の header に 1 箇所のみ配置（パンくず: `マイページ > 履歴`）

## 2. Bottom Tab Bar の正規化

- [x] 2.1 `apps/reservation/src/widgets/bottom-tab-bar/ui/BottomTabBar.vue` の `TABS` 定数で履歴タブの `to` を `{ name: 'history' }` に変更し、暫定コメントを削除
- [x] 2.2 同ファイルの `activeTab` computed に `if (path.startsWith("/history")) return "history";` 分岐を追加し、`/profile` 配下で履歴が点灯しない挙動に揃える
- [x] 2.3 `BottomTabBar.spec.ts`（無ければ新設）で「`/history` 配下で履歴のみ active」「`/profile` 配下でプロフィールのみ active」「`/events` 配下でホームのみ active」の 3 シナリオをテスト

## 3. 履歴用集計関数

- [x] 3.1 `apps/reservation/src/features/history-stats-strip/lib/computeHistoryStats.ts` を新設し、`{ attendedCount, daysToNext, streakMonths }` を算出する pure function を実装（design Decision 3 のロジック・NEXT はカレンダー日数差）
- [x] 3.2 `computeHistoryStats.spec.ts` で TDD 9 シナリオ pass（0 件 / TOTAL / NEXT 同日 0・翌日 1・8 日後 8 / 過去 reserved 無視 / STREAK 連続 3 / 1 ヶ月飛ばし / 直近月なし / 同月複数 / 前月までで途切れる）

## 4. Stats Strip Widget

- [x] 4.1 `apps/reservation/src/widgets/history-stats-strip/ui/HistoryStatsStrip.vue` を新設し、3 列グリッド（TOTAL / NEXT / STREAK）+ kicker トーンの単位 + HQ デザイントークンのみで実装
- [x] 4.2 `index.ts` で Public API 公開（widget + features 両方）
- [x] 4.3 `HistoryStatsStrip.spec.ts` で「props で受けた値を 3 列に表示」「`null` 値は `—` 表示」「`<dl>/<dt>/<dd>` セマンティック」のレンダリングシナリオを書く

## 5. 履歴行 + 状態バッジ

- [x] 5.1 `apps/reservation/src/features/history-list/ui/HistoryRow.vue` を新設（日付セル `MM/DD` + 曜日 / イベント名・会場・時間 / 予約番号 / 状態バッジ / mobile 390px 対応）
- [x] 5.2 既存 `features/profile-stats/ui/ReservationStatusBadge.vue` を `entities/reservation/ui/` に `git mv` し、`entities/reservation` Public API から再 export。`profile-stats/index.ts` の重複 export を削除し StatsSection の import を `@/entities/reservation` 経由に変更
- [x] 5.3 キャンセル済の行はタイトルを `line-through` + muted 色で描画。HistoryRow.spec.ts の cancelled / attended ケースで確認
- [x] 5.4 本 change では行は非リンク（`<article>`）として描画。HistoryRow.spec.ts で `tagName === 'ARTICLE'` / `<a>` 不在を確認。Issue #213 実装時に `<router-link>` 単純置換できる構造

## 6. グループ分割と並び順

- [x] 6.1 `apps/reservation/src/features/history-list/lib/splitReservations.ts` を新設し、`{ upcoming, past }` に分割する pure function を実装（予約中 = `reserved` AND 未来・upcoming は ASC / past は DESC）
- [x] 6.2 `splitReservations.spec.ts` で 6 シナリオ pass（未来 reserved → upcoming / 過去 reserved → past / attended・cancelled・no_show・waitlist → past / upcoming ASC / past DESC / 空配列）
- [x] 6.3 `apps/reservation/src/features/history-list/ui/HistoryGroup.vue` を新設し、Kicker 見出し + HistoryRow リストを描画。`features/history-list/index.ts` で Public API 公開

## 7. キャンセル動線の移管

- [x] 7.1 `features/booking/useCancelBooking` + `CancelBookingDialog` を HistoryPage に組み込み（ProfilePage 側からは Section 9 で削除）
- [x] 7.2 HistoryRow.vue で予約中グループ用の `showCancel` prop を受け取り、ボタン押下で `request-cancel` emit
- [x] 7.3 HistoryPage でキャンセル成功時にローカル書き換え (再 fetch なし)。対象行が upcoming → past へ移動するロジックは splitReservations の再計算で自動再描画

## 8. HistoryPage の組み立て

- [x] 8.1 HistoryPage で `useAuthSession` + `fetchMyReservations` を呼び `reservations` ref を保持
- [x] 8.2 4 状態を実装: Loading（スケルトン）/ Empty（Stats Strip 0 表示 + 「まだ予約がありません」+ `/events` CTA）/ Error（バナー + 再試行）/ Success（Stats Strip + 2 グループ + 件数表示）
- [x] 8.3 ヘッダに「履歴」h1 + `{N} ENTRIES` モノスペース注記を配置
- [x] 8.4 BottomTabBar 表示確認: `useBottomTabBarVisible` の blacklist に `history` は含まれないため自動で表示される（既存挙動を継承・追加対応不要）

## 9. プロフィール画面 STATS の整理

- [x] 9.1 `StatsSection.vue` から `HISTORY · 予約履歴` kicker 以下のリスト全体・キャンセルボタン・`isCancellableNow` ヘルパ・`request-cancel` emit を削除。集計 3 行 + 0 件時「—」表示のみ残す
- [x] 9.2 `StatsSection.spec.ts` を新規作成（既存ファイルなし）し、集計 3 行 / 0 件で「—」/ 履歴リスト不在 / キャンセルボタン不在 / HISTORY kicker 不在 の 5 シナリオを書き pass 確認
- [x] 9.3 `ProfilePage.vue` から `cancelTarget` / `cancelDialogOpen` / `useCancelBooking` / `CancelBookingDialog` / `onRequestCancel` / `onConfirmCancel` / `cancelErrorMessage` を削除（`fetchMyReservations` + `reservations` ref は維持）
- [x] 9.4 ProfilePage 単体の component test 新設は重い (auth/level/account 依存) ため、9.2 の StatsSection 単体テストでカバーする方針 (描画されないことの確認)。design 整合性は保たれる

## 10. spec 整合性確認 (delta 反映前提)

- [x] 10.1 `specs/reservation-history-page/spec.md` の ADDED Requirement 群（ルート / ヘッダ / Stats Strip / 予約中グループ / 過去グループ / 履歴行 / キャンセル動線 / 4 状態 / RLS / a11y / E2E）を Propose 段階で書き起こし済み
- [x] 10.2 `specs/reservation-profile-page/spec.md` の MODIFIED「STATS セクション」+ REMOVED「予約履歴からのキャンセル動線」を Propose 段階で書き起こし済み。`openspec validate reservation-history-page` pass 確認

## 11. 最終確認 (UI 変更を一度にまとめてビルド + テスト)

- [x] 11.1 `pnpm --filter @high-q/reservation exec vitest run` 全 pass 確認（57 ファイル / 427 テスト）
- [x] 11.2 `pnpm --filter @high-q/reservation build` 全 pass 確認（型エラー 0）+ `typecheck` も pass
- [x] 11.3 ESLint: monorepo の `pnpm lint` でエラー 0（reservation には専用 lint script なし、ルート設定で他アプリ含めて整合性確認）
- [ ] 11.4 ローカル `pnpm --filter @high-q/reservation dev` での 390px viewport 目視確認は翔太郎くん側で Render Preview で実施（admin/reservation のみのため Preview は出ないが、本 PR は LP を含まない reservation 単独変更のため、ローカル dev での確認となる）
- [x] 11.5 E2E 1 件 `e2e/reservation/history-page.e2e.ts` を新規作成（未認証で `/history` → `/login` リダイレクト + ログインフォーム描画）。CI 実行は #201 の reservation E2E 環境完成後に enabling される
