## Context

admin の現状トップ画面は `/events`。EventsListPage の header は #171 で「会員」「本人確認書類 (+ pending Badge)」「ログアウト」の横遷移リンクを抱えており、コメントに「admin の既定トップ画面のためダッシュボード相当のサマリ機能を兼ねる」と明記されている。つまり「サマリ機能はずっと events 一覧の header が代用してきた」状態。

Issue #149 は MVP2 第一弾として、概況サマリを本来の dashboard 画面に分離する。design sample (`docs/10-デザインサンプル/admin/hq-admin-screens.jsx` の `ScreenDashboard`) を参照しつつ、現状 DB と Sentry 運用に乗る範囲で実装する。

技術的制約:

- admin app には共通サイドバーが無く、各 page が自前 header を持つ (EventsListPage 参照)
- 通知パネルの backing store は無い (新規テーブル追加はしない方針で確定)
- events / reservations / venues / members の RLS は admin 全件 SELECT を許可済み
- 既存 SQL view: `event_list_view`, `event_detail_view`, `event_availability_view`, `member_list_view`, `event_participants_view`
- 集計の時間軸は **JST (Asia/Tokyo)** が運営者の体感と一致する (events.start_at は timestamptz)
- 費用ゼロ運用 (memory: cost_zero_default)

## Goals / Non-Goals

**Goals:**

- ログイン直後の admin 着地画面を `/events` 一覧から「概況サマリ」へ置き換える
- 主要 4 指標 (今後のイベント / 累計参加者 / 今月の参加費合計 / 平均充足率) を 1 クエリで取得し、PostgREST 経由で配信
- 直近イベント 3 件 / 通知パネル (満員直前・最近のキャンセル) / 最近の予約 4 件を表示
- EventsListPage が抱えていた横遷移リンク群 (会員 / 本人確認書類 / ログアウト) を Dashboard でも揃える (Dashboard が新たな着地画面のため)
- 4 状態 (Loading / Empty / Error / Success) を網羅
- E2E は CLAUDE.md ルール (機能あたり 1〜2 件) に従い happy path 1 件

**Non-Goals:**

- 通知パネルでメール送信失敗を扱うこと (Sentry に委譲。email_logs / notifications テーブル新設はしない)
- 共通サイドバー / 共通レイアウト widget の導入 (横遷移は EventsListPage と同様の page-local header で揃える)
- KPI 期間切替 UI (今月 / 先月切替や 6 ヶ月以外の充足率窓) — 固定で運用、要望が出たら別 Issue
- アバター画像表示 (members に avatar 列を持たないため頭文字円のみ)
- 「初回」「経験者」等の経験ラベル表示 (data-schema に経験レベル列が無い)

## Decisions

### D1. Dashboard 用集計を 1 行で返す view `admin_dashboard_view` を新設

**選択肢:**

- A. クライアントから 4〜5 本のクエリを並列発行
- B. 単一 SQL view `admin_dashboard_view` (列 = 各 KPI) を作って 1 行で返す ← **採用**

**理由:**

- N+1 リスクと、集計タイミングのズレ (各クエリ間で reservations が増えた場合の不整合) を抑止
- 既存パターン (`event_list_view` / `event_detail_view`) と整合
- 行は常に 1 行 (条件無し)。集計の境界 (JST 月初・6 ヶ月窓) を view 側で固定し、クライアントの timezone 取り扱いを不要にする

**SECURITY モード:** `SECURITY INVOKER` で作成。admin は events / reservations / venues に対し RLS を通過するため。`event_availability_view` のように member ロールから集計させる必要は無い (dashboard は admin 専用)。

**期待列:**

- `upcoming_event_count` (int) — `events.start_at > now() AND status != 'cancelled' AND visibility = 'published'` の件数
- `upcoming_full_event_count` (int) — 上の中で `capacity IS NOT NULL AND reserved_count >= capacity` の件数
- `attended_this_month_count` (int) — JST 月初 ≤ `events.start_at` < JST 翌月初 かつ `reservations.status = 'attended'` の `SUM(1 + guest_count)`
- `fee_total_this_month` (int) — JST 月初 ≤ `events.start_at` < JST 翌月初 かつ `reservations.status = 'attended'` の `SUM(COALESCE(events.fee, venues.default_fee, 0) * (1 + guest_count))`
- `avg_fill_rate_6m` (numeric) — 直近 6 ヶ月 (JST) で終了済み (`end_at < now()`) かつ `capacity IS NOT NULL AND capacity > 0` のイベントの `AVG(reserved_count::numeric / capacity)` (パーセント換算は UI 側)
- `attended_delta_pct_vs_last_month` (numeric NULL) — 先月対比 (% / 小数)。先月 0 件のときは NULL
- `fee_delta_pct_vs_last_month` (numeric NULL) — 同様

充足率の母数は capacity NULL のイベントを除外 (分母不能)。delta 列は NULL を「— %」で出すこと。

### D2. 「直近イベント 3 件」は既存 `event_list_view` を再利用

新規 view を増やさず、`start_at > now() AND visibility = 'published' AND status != 'cancelled' ORDER BY start_at ASC LIMIT 3` を発行する。残席バー は `@high-q/ui` の `RemainBar` を `event_list_view.reserved_count` + `events.capacity` で描画。これは `/events` 画面と同じ Pattern なので features/composable を共通化候補とするが、本 change では Dashboard 専用 entities slice を用意し、共通化はしない (将来必要になったとき)。

### D3. 通知パネルは 2 集計のみ。新規テーブルなし

- 「満員直前イベント」 = `event_list_view` から `start_at > now() AND capacity IS NOT NULL AND (capacity - reserved_count) BETWEEN 1 AND 2` を `start_at ASC LIMIT 3`
- 「最近のキャンセル」 = `reservations` を `status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_at > now() - interval '7 days'` で `cancelled_at DESC LIMIT 3`、members / events を join (RLS 配下で admin が読める)

メール送信失敗系は Sentry の `notification-email` Edge Function ログに既に流れる運用なので、画面側では扱わない。通知パネルが「件数 0」のときは Empty 表示 (「いまのところ何もありません」)。

### D4. 「最近の予約 4 件」は新規 view `admin_dashboard_recent_bookings_view` を追加

**選択肢:**

- A. クライアントから reservations + members + events を Supabase の embed で取得
- B. SQL view にカプセル化して PostgREST から 1 クエリで取得 ← **採用**

**理由:**

- 「初回バッジ」のような派生列は将来追加候補。view にしておけば追加が容易
- RLS 越しに reservations / members / events を embed する際の FK 曖昧性 (memory: `feedback_postgrest_identity_documents_fk_disambiguate.md`) を view 側で吸収

**列:** `reservation_id` / `member_id` / `member_display_name` / `member_initial` / `event_id` / `event_name` / `created_at` / `status`。直近 4 件は呼び出し側 `LIMIT 4`、`status NOT IN ('cancelled')` でフィルタ。`member_display_name` は `members.last_name + ' ' + members.first_name` (split 後の列を使う) で、`member_initial` は last_name の先頭 1 文字。**`member_id NULL` (退会済み匿名化) の行は除外**。

### D5. Routing は `/` を Dashboard、`/events` は維持

`apps/admin/src/app/router.ts` の `{ path: "/", redirect: { name: "events" } }` を `{ path: "/", name: "dashboard", component: DashboardPage }` に置き換える。auth guard の到達先 (AAL2 + admin での `/login` リダイレクト先) は `{ name: 'events' }` から `{ name: 'dashboard' }` に変更。

### D6. EventsListPage 横遷移リンクの揃え方

EventsListPage の header にある「会員 / 本人確認書類 + pending Badge / ログアウト」をそのまま Dashboard の header にも配置する。重複コードになるが、本 change で共通 widget への抽出は行わない (Non-Goals)。将来 `widgets/admin-page-header` 等に切り出す予定。

### D7. FSD スライス構成

```
apps/admin/src/
├ pages/DashboardPage.vue                          (新)
├ widgets/
│  ├ dashboard-stat-cards/                         (新) - 4 StatCard を 1 グリッドで描画
│  ├ dashboard-upcoming-events/                    (新) - event_list_view から 3 件
│  ├ dashboard-notifications/                      (新) - 満員直前 + 最近のキャンセル
│  └ dashboard-recent-bookings/                    (新) - 最近の予約 4 件
├ features/dashboard-stats/                        (新) - useDashboardStats composable
├ entities/dashboard/                              (新) - queryOptions (集計 view / 直近イベント / 通知 / 最近の予約)
└ shared/ui/StatCard.vue                           (新) - @high-q/ui に Kicker/Badge/RemainBar はあるが StatCard は無いので admin shared/ui に作る
```

`StatCard` は将来 reservation でも欲しくなる可能性があるが、3 アプリ共通化の判断は次の Issue に回し、本 change では admin 専用に置く。

### D8. 4 状態の出し分け

- **Loading**: 各 widget で skeleton (StatCard skeleton 4 / 直近イベント 3 行 / 通知 2 行 / 最近の予約 4 行)。初回マウント中とリフェッチ中の両方
- **Empty**:
  - 全体 Empty (events / reservations が 0 件): 「最初のイベントを作りましょう」CTA に集約
  - StatCard 個別: 値は 0 表示 (Empty CTA を出さない)
  - 通知パネル Empty: 「いまのところ何もありません」
  - 最近の予約 Empty: 「予約はまだありません」
- **Error**: 各 widget で `role="alert"` + 「再試行」CTA (widget 単位、ページ全体は再試行しない)
- **Success**: 通常表示

### D9. テスト戦略

- **Component test (Vitest + @vue/test-utils)**:
  - `DashboardPage.vue` — 4 widget が正しいレイアウトで配置
  - 各 widget — 4 状態の出し分け
  - StatCard — value / unit / delta / deltaTone (up / down / flat / null) の表示
- **Composable unit test (Vitest + MSW)**:
  - `useDashboardStats` — view 列マッピング、JST 月境界の取り扱い (view 側で固定なのでクライアントは値を受け取るだけだが、null delta の扱いを検証)
- **SQL view 単体テスト**:
  - `supabase/tests/dashboard_view.sql` 相当 (test-helpers 経由)。fixture: 今月 attended 2 / 先月 attended 1 → delta = +100% など
- **E2E (Playwright)**:
  - happy path: 認証済み admin で `/` にアクセス → Dashboard が描画され、StatCard 4 枚 + 直近イベント + 通知 + 最近の予約が見える (各 1 assert)

### D10. デザイントークン

design sample で使われている `HQA.paper` / `HQA.hairline` / `HQA.accent` 等は、`@high-q/tailwind-preset` の utility (`bg-paper` / `border-hairline` / `text-accent`) と CSS 変数 (`var(--hq-*)`) に既にマッピング済み。マジックナンバー禁止 (CLAUDE.md Pillar 3)。

## Risks / Trade-offs

- **[Risk] `admin_dashboard_view` の 1 行集計が将来 sub-2 秒で返らない**
  → Mitigation: reservations / events の行数が小規模 (運用 1 年で数千件レベル) なため当面は問題なし。issue が顕在化したら materialized view 化を別 Issue で検討
- **[Risk] JST 月境界の view 内固定が、`docker` ローカル開発と本番でタイムゾーン差異を生む**
  → Mitigation: view 内で `AT TIME ZONE 'Asia/Tokyo'` を明示。`SHOW timezone` への依存をなくす
- **[Risk] 「最近のキャンセル」7 日窓が UX 的に短すぎる / 長すぎる**
  → Mitigation: 運用初月で翔太郎くんの体感を聞いて調整 (定数化して view 外で持つ)
- **[Risk] EventsListPage との header 重複が技術的負債になる**
  → Mitigation: 設計に「将来 `widgets/admin-page-header` に共通化」と明記、本 change の Non-Goals で線引き
- **[Risk] Dashboard 全体が Error のとき「ログアウトもできない」事故**
  → Mitigation: header (横遷移 + ログアウト) は widget 群と独立に描画し、widget が Error でも header は機能する構造に
- **[Risk] reservation_id RLS で member_id 匿名化済み行が混ざり member 名が NULL**
  → Mitigation: `admin_dashboard_recent_bookings_view` 内で `WHERE member_id IS NOT NULL` で除外

## Migration Plan

1. 新規 migration `supabase/migrations/<ts>_admin_dashboard_views.sql`:
   - `admin_dashboard_view` CREATE
   - `admin_dashboard_recent_bookings_view` CREATE
   - 各 view に対して anon / authenticated / service_role の明示 GRANT (CLAUDE.md Pillar 4 / `supabase/templates/new_table.sql` 規約)
2. dev DB に `pnpm db:push` で適用 (memory: dev DB はレム自身で実行)
3. `apps/admin/src/app/router.ts` の `/` ルート差し替え、guard 内の redirect 先変更
4. DashboardPage + widget + features + entities を実装
5. EventsListPage の header コメントから「ダッシュボード相当のサマリ機能を兼ねる」記述を削除 (役割が dashboard に移ったため)
6. `HomePlaceholder.vue` を削除 (sync で archive 候補化したまま 1 PR 内で消す)
7. E2E 追加
8. prd 側は merge 後の自動デプロイで Edge Function は不要、SQL migration は `supabase db push` で prd 適用 (memory: prd Supabase 切替は手動 sync)

**Rollback:** `/` ルートを元の `redirect: { name: "events" }` に戻し、view DROP migration を発行。Dashboard 配下の widget は import されなくなるだけで悪影響なし。

## Open Questions (解決済み)

- 「平均充足率」の窓 → **6 ヶ月** で確定 (列名 `avg_fill_rate_6m`)
- 「主 CTA = 新しいイベント」を状況連動させるか → **固定** で確定
- 通知パネルの「キャンセル」の表示項目 → **member 名 + event 名のみ** で確定 (事由は出さない)
