## ADDED Requirements

### Requirement: `/` ダッシュボード画面の構成

`apps/admin` の `/` 画面 (Dashboard) は、admin 認証 (AAL2 + admin ロール) 下で MUST 以下の 4 ブロックを縦方向に配置し、サークル運営の概況を一目で把握可能にする:

1. **StatCard 4 枚** — 「今後のイベント」「累計参加者 (今月)」「今月の参加費合計」「平均充足率 (直近 6 ヶ月)」を横並び (PC) / 縦並び (モバイル) のグリッドで表示
2. **直近イベント 3 件** — 開催予定の published イベントを start_at 昇順で 3 件、残席バー付きで表示
3. **通知パネル** — 「満員直前イベント」「最近のキャンセル」の 2 種類のみを表示 (メール送信失敗は本画面の対象外)
4. **最近の予約 4 件** — 直近の reservation 4 件を頭文字円 + 氏名 + イベント名 + 経過時間で表示

ヘッダ右側に主 CTA「新しいイベントを作る」を SHALL 配置し、押下で `/events/new` へ遷移する。ヘッダには会員一覧 / 本人確認書類 (pending Badge 付き) / ログアウト の横遷移リンクを SHALL 揃える。これらは EventsListPage と同じ動線で機能する。

#### Scenario: 認証済み admin で `/` を開く
- **WHEN** AAL2 + admin ユーザーが `/` にアクセス
- **THEN** Dashboard 画面が描画され、4 ブロックすべてが表示される (Loading 完了後)

#### Scenario: 未認証アクセス
- **WHEN** 未認証ユーザーが `/` にアクセス
- **THEN** auth guard により `/login` にリダイレクトされる

#### Scenario: 非 admin アクセス
- **WHEN** AAL2 だが `role != 'admin'` のユーザーが `/` にアクセス
- **THEN** 自動サインアウトされ `/login?reason=not-admin` にリダイレクトされる

#### Scenario: 主 CTA からの遷移
- **WHEN** ユーザーが「新しいイベントを作る」を押下
- **THEN** `/events/new` に遷移する

### Requirement: StatCard 4 指標の定義

Dashboard の StatCard 4 枚は、それぞれ以下の指標 SHALL 表示する。値は `admin_dashboard_view` ビュー (data-schema capability で定義) を単一クエリで取得する:

1. **今後のイベント** — `upcoming_event_count` (件)。sub-label に `upcoming_full_event_count` 件が満員である旨を表示 (`upcoming_full_event_count > 0` のときのみ)
2. **累計参加者 (今月)** — `attended_this_month_count` (名)。delta は `attended_delta_pct_vs_last_month` を「+12%」「-3%」形式で表示。`null` の場合は「— %」
3. **今月の参加費合計** — `fee_total_this_month` を「¥84,500」のような円表示 (3 桁区切り)。delta は `fee_delta_pct_vs_last_month` を同様に表示
4. **平均充足率 (6 ヶ月)** — `avg_fill_rate_6m` を 0〜100 のパーセント整数で表示 (NULL のときは「—」)

各 StatCard は MUST kicker 番号 (`01` / `02` / `03` / `04`) と label (上記名称) を持ち、HQ デザイントークン (`var(--hq-*)` / Tailwind preset utility) 経由のみで着色する SHALL。

#### Scenario: 今月の参加費合計の表示形式
- **WHEN** `fee_total_this_month = 84500`
- **THEN** StatCard の value は「¥84,500」と表示される (3 桁区切り、円記号付き)

#### Scenario: 平均充足率が NULL
- **WHEN** 直近 6 ヶ月で capacity を持つ終了済みイベントが 1 件も無く `avg_fill_rate_6m = NULL`
- **THEN** StatCard の value は「—」と表示され、誤って 0% と読まれない

#### Scenario: delta が NULL
- **WHEN** `attended_delta_pct_vs_last_month = NULL` (先月 attended が 0 件)
- **THEN** delta 表記は「— %」と表示され、トーン (up/down/flat) は中立 (flat) で描画される

#### Scenario: 満員直前のサブラベル
- **WHEN** `upcoming_full_event_count = 2`
- **THEN** 「今後のイベント」StatCard の sub-label に「2 件は満員」と表示される

### Requirement: 直近イベント 3 件ブロック

Dashboard の「直近イベント」ブロックは、`event_list_view` から `start_at > now() AND visibility = 'published' AND status != 'cancelled' ORDER BY start_at ASC LIMIT 3` を MUST 取得し、各行に以下を表示する:

- 日付 (MM/DD + 曜日)
- イベント名
- 会場名 (短縮表示、`/events` と同じロジック)
- 時間 (`HH:mm – HH:mm`)
- 残席バー (`@high-q/ui` の `RemainBar`、`taken = reserved_count` / `capacity = events.capacity`)

行クリックで `/events/:id` (admin-event-detail) へ SHALL 遷移する。ブロック右上の「全件を見る ›」リンクで `/events` へ遷移する。

#### Scenario: 3 件の表示と遷移
- **WHEN** 開催予定の published イベントが 5 件存在
- **THEN** start_at 昇順で 3 件のみ表示され、行押下で `/events/:id` に遷移する

#### Scenario: 該当 0 件 (Empty)
- **WHEN** 開催予定の published イベントが 0 件
- **THEN** Empty 表示「予定されたイベントはありません」と `[新しいイベントを作る]` CTA が表示される

#### Scenario: capacity NULL の event
- **WHEN** capacity NULL の event 行を描画
- **THEN** RemainBar の代わりに「N 件」のテキスト表示にフォールバックする (`/events` と同じ規約)

### Requirement: 通知パネル (満員直前 / 最近のキャンセル)

Dashboard の通知パネルは MUST 以下の 2 集計のみを表示し、メール送信失敗 / 本人確認書類関連 / その他は本ブロックでは扱わない:

- **満員直前イベント** — `event_list_view` から `start_at > now() AND capacity IS NOT NULL AND (capacity - reserved_count) BETWEEN 1 AND 2 ORDER BY start_at ASC LIMIT 3`。トーン: 残席 1 は `danger`、残席 2 は `warn`。表示: 「ゆる練 vol.42 残 2 席」のようなフォーマット
- **最近のキャンセル** — `reservations` を `status = 'cancelled' AND cancelled_at > now() - interval '7 days'` で `cancelled_at DESC LIMIT 3`、members / events を join。表示: 「<氏名> 様（<event_name>）」「<経過時間 / 時刻>」

通知パネルの右上には合計件数を表示 SHALL。0 件のときは Empty 表示「いまのところ何もありません」を出す。

#### Scenario: 残席 1 の表示
- **WHEN** `capacity = 18 AND reserved_count = 17` の published 未来イベント
- **THEN** 通知パネルに「<event_name> 残 1 席」が danger トーンで表示される

#### Scenario: 7 日以内のキャンセル
- **WHEN** ある reservation が 3 日前に `status = 'cancelled'` に変わり `cancelled_at` がセット済み
- **THEN** 「最近のキャンセル」セクションに当該 member 名 + event 名で表示される

#### Scenario: 7 日より前のキャンセルは出ない
- **WHEN** ある reservation が 10 日前に `cancelled_at` セット
- **THEN** 通知パネルには表示されない

#### Scenario: メール送信失敗は出ない
- **WHEN** notification-email Edge Function でメール送信が失敗 (Sentry に流れている)
- **THEN** Dashboard 通知パネルには出現しない (Sentry 運用へ委譲)

#### Scenario: 通知 0 件 Empty
- **WHEN** 満員直前 0 件 + 最近のキャンセル 0 件
- **THEN** 通知パネルに「いまのところ何もありません」が表示される

### Requirement: 最近の予約 4 件ブロック

Dashboard の「最近の予約」ブロックは、`admin_dashboard_recent_bookings_view` (data-schema capability で定義) から `LIMIT 4` で取得 SHALL し、各行に以下を表示する:

- 頭文字円 (member の `last_name` 先頭 1 文字、HQ デザイントークン経由で着色)
- 氏名 (`last_name + ' ' + first_name`)
- イベント名
- 経過時間 (created_at からの相対表記。例: 「2 分前」「17 分前」「1 時間前」「昨日」)

`status = 'cancelled'` の reservation および `member_id IS NULL` の匿名化済み reservation は MUST 除外する。

#### Scenario: 4 件の表示
- **WHEN** 直近 24 時間に新規予約が 6 件作成 (うち 1 件はその後 cancelled)
- **THEN** cancelled を除く 5 件の最新 4 件が created_at 降順で表示される

#### Scenario: 経過時間の表示形式
- **WHEN** `created_at = now() - interval '17 minutes'`
- **THEN** 「17 分前」が表示される

#### Scenario: Empty
- **WHEN** 全期間で reservation が 0 件
- **THEN** Empty 表示「予約はまだありません」が表示される

#### Scenario: 匿名化済み予約は除外
- **WHEN** ある reservation の `member_id = NULL` (退会済み会員の過去予約)
- **THEN** 当該 reservation は最近の予約ブロックに表示されない

### Requirement: 4 状態の網羅

Dashboard 上の各 widget は MUST 以下 4 状態を出し分ける:

- **Loading** — 初回マウントまたはリフェッチ中。`Skeleton` プリミティブで各 widget に対応する形状を描画
- **Empty** — クエリ結果が要件を満たさない (件数 0 等)。widget 固有のメッセージと、必要に応じて CTA を表示
- **Error** — クエリ失敗。`role="alert"` 付きのコンテナにエラーコード (例: `ERR · supabase / admin_dashboard_view · 503`) と「再試行」CTA を表示。再試行は widget 単位で発火し、ページ全体を再ロードしない
- **Success** — 通常表示

ヘッダ (横遷移リンク + 主 CTA + ログアウト) は widget の Error 状態の影響を受けず常に機能 MUST する。

#### Scenario: Error の局所化
- **WHEN** StatCard の集計クエリが失敗、他 widget は成功
- **THEN** StatCard ブロックのみ Error 表示になり、直近イベント / 通知 / 最近の予約 / ヘッダ (ログアウト含む) は通常表示される

#### Scenario: 再試行 CTA
- **WHEN** ユーザーが Error 状態の widget で「再試行」を押下
- **THEN** 当該 widget のクエリのみが refetch され、Loading → Success / Error に遷移する

### Requirement: FSD レイヤー構成

Dashboard 関連の実装は MUST 以下の FSD レイヤーに配置する。依存方向は `pages → widgets → features → entities → shared` の一方向のみとし、各スライスは `index.ts` 経由で Public API を露出する:

- `pages/DashboardPage.vue` — ルートエントリ。ヘッダ + 各 widget をマウント
- `widgets/dashboard-stat-cards/` — 4 枚の StatCard を含む複合 widget
- `widgets/dashboard-upcoming-events/` — 直近イベント 3 件
- `widgets/dashboard-notifications/` — 通知パネル
- `widgets/dashboard-recent-bookings/` — 最近の予約 4 件
- `features/dashboard-stats/` — Dashboard 集計用の composable
- `entities/dashboard/` — `admin_dashboard_view` / `admin_dashboard_recent_bookings_view` の queryOptions
- `shared/ui/StatCard.vue` — StatCard プリミティブ (kicker / label / value / unit / delta / sub-label / accent flag)

#### Scenario: 依存方向違反が無い
- **WHEN** `apps/admin/src` 配下の dashboard 関連ファイルに対し `eslint-plugin-boundaries` / `dependency-cruiser` を実行
- **THEN** 依存方向違反 0 件

### Requirement: デザイントークン準拠

Dashboard 配下の全コンポーネントは、HQ デザイントークン (`@high-q/tailwind-preset` の utility または `var(--hq-*)` CSS 変数) 経由でのみ着色 SHALL する。リテラル色 (`#xxxxxx` / `rgb()`)、リテラル spacing (`px-[12px]` 等の任意値)、リテラル font-family の埋め込みを禁止する。

#### Scenario: マジックナンバー検査
- **WHEN** `apps/admin/src/{pages,widgets,features,entities,shared/ui}/**/*.vue` 配下の dashboard 関連ファイルを `#[0-9a-f]{3,6}\b` および `\[\d+px\]` で grep
- **THEN** マッチ 0 件

### Requirement: アクセシビリティ

Dashboard 画面は MUST WCAG 2.1 AA レベルの a11y を満たす:

- StatCard はそれぞれ独立した landmark を持たず、視認順 (左上 → 右下) のフォーカス順序を SHALL 維持する
- 通知パネルの各エントリは `<ul>` / `<li>` セマンティクスで列挙する
- Error 状態のコンテナは `role="alert"` を SHALL 付与する
- 直近イベントの行クリック遷移は MUST キーボード操作可能 (Tab で focus、Enter で `/events/:id`)
- 「再試行」「新しいイベントを作る」「ログアウト」等の操作可能要素は `aria-label` を持つ
- 通知パネル / 最近の予約の経過時間は `<time datetime="...">` で表現し、相対表記をスクリーンリーダで読み上げ可能にする

#### Scenario: 経過時間の datetime 属性
- **WHEN** `created_at = '2026-06-08T10:00:00Z'` の予約行を描画
- **THEN** 「17 分前」の文字列を内包する `<time datetime="2026-06-08T10:00:00Z">` 要素が生成される

#### Scenario: キーボードナビゲーション
- **WHEN** Tab キーで進める
- **THEN** ヘッダ → StatCard 4 → 直近イベント行 → 通知行 → 最近の予約行 → 主 CTA の順に focus が移る

### Requirement: テスト

Dashboard 画面は MUST 以下のテストを持つ:

- **Component test (Vitest + @vue/test-utils)**: `DashboardPage` / 4 widget 各々の 4 状態出し分け / StatCard の値表示 / 「再試行」の局所動作
- **Composable unit test (Vitest + MSW)**: `useDashboardStats` の null delta 取り扱い / 経過時間表記の境界 (0 分 / 60 分 / 24 時間 / 7 日)
- **SQL view 単体テスト**: `admin_dashboard_view` の集計ロジックを fixture 投入で検証 (今月 attended / 先月対比 / 充足率 / 満員件数)
- **E2E (Playwright)**: 認証済み admin で `/` にアクセス → Dashboard が描画され、4 ブロックすべてが表示される happy path 1 件

#### Scenario: E2E の通過
- **WHEN** `pnpm --filter @high-q/e2e test` を実行 (admin プロジェクト)
- **THEN** Dashboard happy path 1 件が pass する
