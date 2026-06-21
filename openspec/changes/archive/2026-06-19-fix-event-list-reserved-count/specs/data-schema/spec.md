## MODIFIED Requirements

### Requirement: event_list_view ビュー

システムは `event_list_view` という SQL view を MUST 提供する。本 view は admin の `/events` 画面が単一クエリで一覧を取得するための DTO として機能し、以下の列を返す:

- `id` (uuid) — events.id
- `name` (text) — events.name
- `description` (text) — events.description
- `start_at` (timestamptz) — events.start_at
- `end_at` (timestamptz) — events.end_at
- `venue_id` (uuid) — events.venue_id
- `venue_name` (text) — venues.name（join 取得）
- `fee` (integer) — events.fee（NULL なら venues.default_fee で COALESCE）
- `capacity` (smallint) — events.capacity
- `visibility` (text) — events.visibility（'draft' / 'published' / 'private'）
- `status` (text) — events.status（'scheduled' / 'cancelled' / 'closed'）
- `cancel_deadline` (timestamptz) — events.cancel_deadline
- `reserved_count` (integer) — **本人 + 同伴を含む人数**。`SUM(1 + guest_count) FILTER (status IN ('reserved', 'attended'))`。チェックイン操作で `status` が `'reserved' → 'attended'` に変わっても両方とも filter にヒットするため**減らない**。`cancelled` は除外。**admin の `event_detail_view.reserved_count` および `event_availability_view.reserved_count` と同一の集計ロジック** SHALL を共有する
- `created_at` / `updated_at` (timestamptz) — events 由来

view は events × venues の `LEFT JOIN`（venues 削除時の参照整合性は events.venue_id の `ON DELETE RESTRICT` で保証されているが、view 自体は LEFT JOIN で耐性を持たせる）と、reservations の集計サブクエリ（`SUM(1 + guest_count) FILTER (WHERE status IN ('reserved', 'attended'))`）を持つ。view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM event_list_view LIMIT 1` を実行
- **THEN** 上記の全列が返る

#### Scenario: 残席数が正しく集計される（同伴含む）
- **WHEN** ある event に対して `status = 'reserved'` の reservations が 3 件（うち 1 件は guest_count=2）、`status = 'cancelled'` が 2 件存在する
- **THEN** 当該 event の `reserved_count` は **(3 + 2) = 5 名**（active な予約全件 × 本人+同伴）を返す。cancelled は除外

#### Scenario: チェックイン操作で予約数は不変
- **WHEN** 上記状態から 1 件チェックイン（`status='reserved' → 'attended'`）する
- **THEN** `reserved_count` は **5 のまま**（active な予約は減らない）

#### Scenario: 一覧と詳細の集計同値性
- **WHEN** 任意の event_id に対し `SELECT reserved_count FROM event_list_view WHERE id = X` と `SELECT reserved_count FROM event_detail_view WHERE id = X` を admin ロールで同時実行
- **THEN** 両者は同じ値を返す（集計ロジック共有）

#### Scenario: fee の COALESCE
- **WHEN** events.fee が NULL で venues.default_fee が 1000 の event 行
- **THEN** view の `fee` 列は 1000 を返す

#### Scenario: venue 削除耐性
- **WHEN** events.venue_id が指す venues 行が（理論上）削除された場合
- **THEN** event_list_view は当該 event の行を `venue_name = NULL` で返す（実運用では venues 削除は ON DELETE RESTRICT で拒否されるため到達しない安全網）
