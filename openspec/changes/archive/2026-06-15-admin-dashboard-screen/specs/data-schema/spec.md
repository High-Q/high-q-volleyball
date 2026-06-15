## ADDED Requirements

### Requirement: admin_dashboard_view ビュー

システムは `admin_dashboard_view` という SQL view を MUST 提供する。本 view は admin の `/` (Dashboard) 画面が概況数値を単一クエリで取得するための DTO として機能し、**常に 1 行**を返す:

返す列:

- `upcoming_event_count` (integer) — `events.start_at > now() AND status != 'cancelled' AND visibility = 'published'` の件数
- `upcoming_full_event_count` (integer) — 上記のうち `capacity IS NOT NULL AND reserved_count >= capacity` の件数 (`event_list_view` を参照)
- `attended_this_month_count` (integer) — JST 月初 ≤ `events.start_at` < JST 翌月初 かつ `reservations.status = 'attended'` の `SUM(1 + guest_count)`
- `attended_last_month_count` (integer) — JST 先月初 ≤ `events.start_at` < JST 月初 の同条件集計
- `attended_delta_pct_vs_last_month` (numeric NULL) — `(attended_this_month_count - attended_last_month_count)::numeric / NULLIF(attended_last_month_count, 0)`。先月 0 件のときは NULL
- `fee_total_this_month` (integer) — JST 当月の `reservations.status = 'attended'` に対して `SUM(COALESCE(events.fee, venues.default_fee, 0) * (1 + guest_count))`
- `fee_total_last_month` (integer) — JST 先月の同条件集計
- `fee_delta_pct_vs_last_month` (numeric NULL) — `(fee_total_this_month - fee_total_last_month)::numeric / NULLIF(fee_total_last_month, 0)`。先月 0 のときは NULL
- `avg_fill_rate_6m` (numeric NULL) — `events.end_at < now() AND events.start_at >= now() - interval '6 months' AND events.capacity IS NOT NULL AND events.capacity > 0` のイベントに対し `AVG(reserved_count::numeric / capacity)`。該当 0 件のとき NULL

view は MUST `SECURITY INVOKER` で作成し、参照テーブルの RLS を継承する (admin は events / reservations / venues に SELECT 通過済み)。JST タイムゾーンの境界計算は view 内で `AT TIME ZONE 'Asia/Tokyo'` を明示し、セッションの timezone 設定に依存しない MUST。

新規 migration は MUST anon / authenticated / service_role の 3 ロールへの権限を明示する (`supabase/templates/new_table.sql` 規約に準拠)。本 view は admin 専用契約のため anon は明示 REVOKE、authenticated / service_role は SELECT GRANT。

#### Scenario: 常に 1 行を返す
- **WHEN** admin が `SELECT * FROM admin_dashboard_view` を実行
- **THEN** 行数は **1** を返す (events / reservations が空でも 0 件のカウントを返す)

#### Scenario: 累計参加者の今月集計
- **WHEN** 今月 (JST) 開催のイベントに `status = 'attended', guest_count = 1` の reservation が 3 件存在
- **THEN** `attended_this_month_count` は **6** を返す ((1+1) × 3)

#### Scenario: 先月対比 delta
- **WHEN** 今月 attended が 12、先月 attended が 10
- **THEN** `attended_delta_pct_vs_last_month` は `0.20` (= 20%) を返す

#### Scenario: 先月 0 件の delta は NULL
- **WHEN** 今月 attended が 5、先月 attended が 0
- **THEN** `attended_delta_pct_vs_last_month` は NULL を返す (0 除算回避)

#### Scenario: 参加費合計は events.fee → venues.default_fee の fallback を尊重
- **WHEN** イベント A (events.fee = 1500, capacity = 18) で attended が 4 件 (各 guest_count = 0)、イベント B (events.fee = NULL, venues.default_fee = 1200) で attended が 2 件
- **THEN** `fee_total_this_month` は `1500 × 4 + 1200 × 2 = 8400` を返す

#### Scenario: 平均充足率の母数は capacity 設定済み終了済みのみ
- **WHEN** 直近 6 ヶ月で終了済みイベントが 5 件、うち 2 件は capacity NULL
- **THEN** `avg_fill_rate_6m` は capacity を持つ 3 件の `reserved_count / capacity` の平均を返す。capacity NULL の 2 件は除外される

#### Scenario: 平均充足率が NULL
- **WHEN** 直近 6 ヶ月で capacity を持つ終了済みイベントが 0 件
- **THEN** `avg_fill_rate_6m` は NULL を返す (誤って 0 を返さない)

#### Scenario: JST 月境界が固定される
- **WHEN** UTC 1 日 0 時 (= JST 同日 9 時) 開催の event を「今月開催」として集計させたい
- **THEN** view 内で `AT TIME ZONE 'Asia/Tokyo'` 経由で月境界が判定されるため、セッション timezone に関わらず期待通り「今月」に分類される

#### Scenario: 3 ロールの権限が明示される
- **WHEN** `has_table_privilege` で各ロールの権限を問い合わせ
- **THEN** `admin_dashboard_view` に対し anon は SELECT 権限なし (明示 REVOKE)、authenticated / service_role はそれぞれ SELECT 権限ありが確認できる

### Requirement: admin_dashboard_recent_bookings_view ビュー

システムは `admin_dashboard_recent_bookings_view` という SQL view を MUST 提供する。本 view は admin の Dashboard 画面が「最近の予約 4 件」ブロックの取得に使う DTO で、reservations / members / events を join 済みの状態で返す:

返す列:

- `reservation_id` (uuid) — reservations.id
- `member_id` (uuid) — reservations.member_id
- `member_display_name` (text) — `members.last_name || ' ' || members.first_name` (NULL の場合は会員 nickname にフォールバック)
- `member_initial` (text) — `members.last_name` の先頭 1 文字 (NULL の場合は nickname の先頭 1 文字)
- `event_id` (uuid) — reservations.event_id
- `event_name` (text) — events.name
- `created_at` (timestamptz) — reservations.created_at
- `status` (text) — reservations.status

view は MUST `SECURITY INVOKER` で作成。`reservations.member_id IS NULL` (退会済み匿名化) および `reservations.status = 'cancelled'` の行は view 側で除外 MUST する (Dashboard 画面の表示要件と整合させ、クライアント側フィルタの漏れを防ぐ)。

呼び出し側は `ORDER BY created_at DESC LIMIT 4` で発行する想定だが、view 自体は ORDER / LIMIT を持たない (再利用性確保)。

新規 migration は MUST anon / authenticated / service_role の 3 ロールへの権限を明示する。本 view は admin 専用契約のため anon は明示 REVOKE、authenticated / service_role は SELECT GRANT。

#### Scenario: 匿名化済み行は除外
- **WHEN** ある reservation の `member_id = NULL`
- **THEN** `admin_dashboard_recent_bookings_view` の結果に当該行は含まれない

#### Scenario: キャンセル済みは除外
- **WHEN** ある reservation の `status = 'cancelled'`
- **THEN** view の結果に当該行は含まれない

#### Scenario: 氏名フォールバック
- **WHEN** `members.last_name = NULL AND members.first_name = NULL AND members.nickname = '美咲'`
- **THEN** `member_display_name` は「美咲」、`member_initial` は「美」を返す

#### Scenario: 3 ロールの権限が明示される
- **WHEN** `has_table_privilege` で各ロールの権限を問い合わせ
- **THEN** `admin_dashboard_recent_bookings_view` に対し anon は SELECT 権限なし (明示 REVOKE)、authenticated / service_role はそれぞれ SELECT 権限ありが確認できる
