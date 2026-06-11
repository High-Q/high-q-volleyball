## 1. DB マイグレーション (集計 view)

- [x] 1.1 新規 migration `supabase/migrations/<ts>_admin_dashboard_views.sql` を `supabase/templates/new_table.sql` を出発点に作成 (-- ROLLBACK: 手順コメント含む)
- [x] 1.2 `admin_dashboard_view` を `SECURITY INVOKER` で CREATE。列: `upcoming_event_count` / `upcoming_full_event_count` / `attended_this_month_count` / `attended_last_month_count` / `attended_delta_pct_vs_last_month` / `fee_total_this_month` / `fee_total_last_month` / `fee_delta_pct_vs_last_month` / `avg_fill_rate_6m`。JST 月境界は `AT TIME ZONE 'Asia/Tokyo'` を明示
- [x] 1.3 `admin_dashboard_recent_bookings_view` を `SECURITY INVOKER` で CREATE。`member_id IS NOT NULL AND status != 'cancelled'` で view 内フィルタ済み。氏名は `last_name + ' ' + first_name` で組み立て、nickname フォールバック付き
- [x] 1.4 migration に anon / authenticated / service_role の SELECT GRANT を明示追加 (2 view 各々)
- [x] 1.5 dev DB に migration 適用 (`pnpm db:push`) し、`supabase db query --linked --file supabase/tests/verify_grants.sql` で 2 view × 3 ロール × SELECT が green であることを確認
- [x] 1.6 smoke verify (`supabase/tests/verify_admin_dashboard_views.sql`) で view 存在 / admin_dashboard_view 1 行 / cancelled・匿名化除外 / 権限 anon=false/auth=true/service=true を確認。fixture を流した数値検証 (今月集計 / delta / 0 除算 NULL / fee fallback / 充足率 NULL) は dev DB 制約 (members の auth.users 紐付け等) のため pgTAP 等の test infra と共に後段で実装する

## 2. entities/dashboard (queryOptions)

- [x] 2.1 `apps/admin/src/entities/dashboard/` を新規作成。`index.ts` で Public API を export
- [x] 2.2 admin app に typegen 機構が未導入のため、`model/dashboard.types.ts` で view 列を Branded Types 利用の手書き型として定義 (既存 admin entities の慣例に準拠)
- [x] 2.3 既存 admin の `Result<T, FetchError>` async getter pattern (TanStack Query は未導入) で 5 つの fetcher を実装: `getDashboardStats` / `getDashboardRecentBookings` / `getDashboardUpcomingEvents` / `getDashboardNearFullEvents` / `getDashboardRecentCancellations`
- [x] 2.4 entities unit test (MSW): 各 query の URL / select / order / limit が仕様通りであることを検証

## 3. shared/ui/StatCard

- [x] 3.1 `apps/admin/src/shared/ui/StatCard.vue` を新規作成 (props: kicker / label / value / unit? / delta? / deltaTone / sub? / accent?)
- [x] 3.2 デザイントークン (`var(--hq-*)` / Tailwind preset utility) のみで着色。マジックナンバー禁止
- [x] 3.3 StatCard component test: props 組合せ (delta null / sub あり/なし / accent on/off / value 型) を網羅

## 4. features/dashboard-stats (composable)

- [ ] 4.1 `apps/admin/src/features/dashboard-stats/` を新規作成。`index.ts` で Public API
- [ ] 4.2 `useDashboardStats` composable: dashboardStatsQuery を fetch し、StatCard 4 枚分の view model を返す (deltaTone を up/down/flat/null に変換、percent 整数化、currency 円書式化、null delta は「— %」へ)
- [ ] 4.3 経過時間 formatter `formatRelativeTime(createdAt)` を作成 (0 分 / 60 分 / 24 時間 / 7 日の境界で表記切替)
- [ ] 4.4 composable unit test: deltaTone 4 種、currency 0/百/千/万、percent NULL、経過時間境界

## 5. widgets/dashboard-stat-cards

- [ ] 5.1 `apps/admin/src/widgets/dashboard-stat-cards/` を新規作成。4 枚の StatCard をグリッド配置 (PC 4 列 / モバイル 1 列)
- [ ] 5.2 4 状態 (Loading skeleton 4 / Empty 表示 / Error `role="alert"` + 再試行 / Success) の出し分け
- [ ] 5.3 widget component test: 4 状態 + 再試行押下で局所 refetch

## 6. widgets/dashboard-upcoming-events

- [ ] 6.1 `apps/admin/src/widgets/dashboard-upcoming-events/` を新規作成。3 件表示、行クリックで `/events/:id` 遷移
- [ ] 6.2 `RemainBar` (capacity NULL は「N 件」テキスト fallback)
- [ ] 6.3 「全件を見る ›」リンクで `/events` へ
- [ ] 6.4 4 状態の出し分け (Empty は「予定されたイベントはありません」+ 新しいイベント CTA)
- [ ] 6.5 widget component test: 4 状態 + 行クリック遷移 + 「全件を見る」遷移

## 7. widgets/dashboard-notifications

- [ ] 7.1 `apps/admin/src/widgets/dashboard-notifications/` を新規作成。「満員直前」「最近のキャンセル」の 2 セクションを縦並び
- [ ] 7.2 満員直前: トーン (残席 1 = danger / 残席 2 = warn)、「<event_name> 残 X 席」フォーマット
- [ ] 7.3 最近のキャンセル: 「<氏名> 様（<event_name>）」+ 相対経過時間 (`<time datetime>` 付き)
- [ ] 7.4 4 状態 (合計 0 件は「いまのところ何もありません」Empty)
- [ ] 7.5 widget component test: 4 状態 + 7 日以前のキャンセル除外 + danger/warn トーンの境界 (残席 0 は対象外 / 残席 3 は対象外)

## 8. widgets/dashboard-recent-bookings

- [ ] 8.1 `apps/admin/src/widgets/dashboard-recent-bookings/` を新規作成。4 件表示
- [ ] 8.2 頭文字円 (HQ デザイントークン)、氏名、event_name、経過時間 (`<time datetime>`)
- [ ] 8.3 4 状態 (Empty は「予約はまだありません」)
- [ ] 8.4 widget component test: 4 状態 + 匿名化済み除外確認 + 経過時間表記

## 9. pages/DashboardPage

- [ ] 9.1 `apps/admin/src/pages/DashboardPage.vue` を新規作成。header (PageBreadcrumb + 横遷移リンク群 + 主 CTA + ログアウト) + 4 widget を縦に並べる
- [ ] 9.2 ヘッダの横遷移リンク群 (会員 / 本人確認書類 + PendingCountBadge / ログアウト) は EventsListPage と同じ動線で配置
- [ ] 9.3 主 CTA「新しいイベントを作る」を header 右側に配置、押下で `/events/new`
- [ ] 9.4 widget 群がそれぞれ独立に Error 状態を持っても header (ログアウト含む) が機能する構造を担保
- [ ] 9.5 DashboardPage component test: 4 widget mount + ヘッダの横遷移 + 主 CTA 遷移

## 10. router 差し替え

- [ ] 10.1 `apps/admin/src/app/router.ts` の `{ path: "/", redirect: { name: "events" } }` を `{ path: "/", name: "dashboard", component: DashboardPage }` に変更
- [ ] 10.2 auth guard 内の `{ name: "events" }` redirect 先 (login → `/`、mfa → `/` 等) のうち、「ログイン直後に着地する画面」を `{ name: "dashboard" }` に切替。`/events` / `/mfa` 等の元動線は維持
- [ ] 10.3 router.spec.ts を更新: `/` で DashboardPage がマウント、未認証は `/login` redirect、AAL2 + admin は `/login` から `/` へ
- [ ] 10.4 EventsListPage の header コメント「admin の既定トップ画面のためダッシュボード相当のサマリ機能を兼ねる」記述を削除

## 11. クリーンアップ

- [ ] 11.1 `apps/admin/src/pages/HomePlaceholder.vue` と `apps/admin/src/pages/HomePlaceholder.spec.ts` を削除
- [ ] 11.2 import 残骸が無いことを `pnpm exec tsc --noEmit` で確認

## 12. E2E

- [ ] 12.1 Playwright admin プロジェクトに dashboard happy path を 1 件追加: 認証済み admin で `/` 着地 → StatCard 4 / 直近イベント / 通知 / 最近の予約の 4 ブロックが存在することを assert

## 13. 最終確認

- [ ] 13.1 `pnpm exec vitest run` をルートで実行し、すべてのテストが pass
- [ ] 13.2 `pnpm --filter @high-q/admin build` が pass (型エラー / boundaries / dependency-cruiser / stylelint 0 件)
- [ ] 13.3 `scripts/static-checks/migrations/check-rls.sh` / `check-rollback-comment.sh` / `check-my-number.sh` が pass
- [ ] 13.4 dev DB に対し動作確認: `/` 着地で 4 ブロック表示、再試行 CTA、行クリック遷移、Empty 状態 (任意で reservations を 0 件にして検証)
- [ ] 13.5 `verify-locally` Skill で動作確認手順を生成して翔太郎くんに提示
