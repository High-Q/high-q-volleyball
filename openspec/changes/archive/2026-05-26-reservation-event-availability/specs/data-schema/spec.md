## ADDED Requirements

### Requirement: event_availability_view ビュー（会員サイト用 予約埋まり具合 集計）

システムは `event_availability_view` という SQL view を MUST 提供する。本 view は会員サイト (`apps/reservation`) のイベント一覧 / 詳細が単一クエリで予約埋まり具合の集計値を取得するための DTO として機能し、admin 用の `event_list_view` / `event_detail_view` と契約境界を明確に分離する。

返す列:

- `event_id` (uuid) — events.id への参照
- `capacity` (smallint NULL) — events.capacity をそのまま返す（client 側で動的ラベル判定に使用）
- `reserved_count` (integer) — **本人 + 同伴を含む人数**。`SUM(1 + guest_count) FILTER (status IN ('reserved', 'attended'))`。チェックイン操作で `status` が `'reserved' → 'attended'` に変わっても両方とも filter にヒットするため**減らない**。`cancelled` は除外。**admin の `event_detail_view.reserved_count` と同一の集計ロジック** SHALL を共有する

view は MUST `SECURITY DEFINER` で作成され、関数所有者（postgres ロール）の権限で `reservations` を全件集計する。これにより会員 (`reservations` の SELECT RLS で自分の予約しか見えない権限) からの呼び出しでも、全件集計を漏れなく返す。同時に、view が返す列は集計のみで個人情報（予約者 ID / member 名 / 個別予約行）を一切含まない MUST。

view は admin 用 `event_list_view` / `event_detail_view` とは独立に運用 MUST し、admin 側のクエリは本変更で **改変 SHALL NOT** する（admin 専用契約を維持）。

集計対象は `events` テーブル全行 SHALL する（公開ステータス / 開催日時のフィルタは view 内では行わない MUST。フィルタは呼び出し側の SQL でかける）。`events.id` ごとに 1 行を返す MUST。

#### Scenario: capacity NULL のイベントの集計
- **WHEN** capacity NULL のイベントに対し `reservations` に `(本人 1 + 同伴 0)` の予約が 11 件存在
- **THEN** `event_availability_view.reserved_count` は **11** を返す。`capacity` は NULL を返す

#### Scenario: capacity あり、同伴ありの集計
- **WHEN** capacity = 18 のイベントに対し `reservations` に `(本人 1 + 同伴 2)` の予約が 1 件、`(本人 1 + 同伴 0)` の予約が 9 件、`(本人 1 + 同伴 1)` の予約が 1 件存在
- **THEN** `event_availability_view.reserved_count` は **(1+2) + 9 + (1+1) = 14** を返す。`capacity` は 18 を返す

#### Scenario: チェックイン済みも母集団に含む
- **WHEN** あるイベントで `status = 'attended'` の予約が 4 件、`status = 'reserved'` の予約が 12 件、いずれも `guest_count = 0`
- **THEN** `event_availability_view.reserved_count` は **16** を返す（attended も母集団に含む）

#### Scenario: cancelled は母集団から除外
- **WHEN** あるイベントで `status = 'cancelled'` の予約が 3 件、`status = 'reserved'` の予約が 8 件
- **THEN** `event_availability_view.reserved_count` は **8** を返す

#### Scenario: 会員ロールから全件集計が返る
- **WHEN** 会員ロール（`is_admin() = false`）で `SELECT event_id, reserved_count FROM event_availability_view` を実行
- **THEN** 当該会員以外の予約も含めた全件集計が返る（view が `SECURITY DEFINER` であるため）

#### Scenario: 個人情報を漏らさない
- **WHEN** `event_availability_view` の列定義を確認
- **THEN** member_id / member 名 / reservation_id / created_at 等の個人情報を特定可能な列は存在しない（`event_id` / `capacity` / `reserved_count` のみ）

#### Scenario: admin view との集計同値性
- **WHEN** 任意の event_id に対し `SELECT reserved_count FROM event_availability_view WHERE event_id = X` と `SELECT reserved_count FROM event_detail_view WHERE id = X` を admin ロールで同時実行
- **THEN** 両者は同じ値を返す（集計ロジック共有）

#### Scenario: events 行ごとに 1 行
- **WHEN** events に 10 行存在し、`SELECT count(*) FROM event_availability_view`
- **THEN** 10 を返す（予約 0 件のイベントも `reserved_count = 0` の行で返る）

### Requirement: event_availability_view の admin view 非改変契約

本変更により、admin 用の `event_list_view` および `event_detail_view` の列定義・集計ロジック・SECURITY モードは **改変 SHALL NOT** する。会員向け集計は `event_availability_view` のみが担う MUST。

#### Scenario: admin view の列定義が維持される
- **WHEN** 本変更の migration 適用後に `event_list_view` / `event_detail_view` の列を SELECT
- **THEN** いずれの view も変更前と同じ列セット・同じ SECURITY モード（INVOKER）を維持する
