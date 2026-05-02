## ADDED Requirements

### Requirement: event_detail_view ビュー

システムは MUST `event_detail_view` という SQL view を提供する。本 view は admin の `/events/:id` 画面が単一クエリでヘッダ情報と StatCard 4 値を取得するための DTO として機能し、以下の列を返す:

- `id` (uuid) — events.id
- `name` (text) — events.name
- `description` (text) — events.description
- `start_at` (timestamptz) — events.start_at
- `end_at` (timestamptz) — events.end_at
- `venue_id` (uuid) — events.venue_id
- `venue_name` (text) — venues.name（join 取得）
- `fee` (integer) — events.fee（NULL なら venues.default_fee で COALESCE）
- `capacity` (smallint) — events.capacity
- `visibility` (text) — events.visibility
- `status` (text) — events.status
- `cancel_deadline` (timestamptz) — events.cancel_deadline
- `reserved_count` (integer) — **本人 + 同伴を含む人数**。`SUM(1 + guest_count) FILTER (status IN ('reserved', 'attended'))`。チェックイン操作で `status` が `'reserved' → 'attended'` に変わっても両方とも filter にヒットするため**減らない**
- `checked_in_count` (integer) — **本人 + 同伴を含む人数**。`SUM(1 + guest_count) FILTER (status = 'attended')`。1 件チェックインすると当該行の `1 + guest_count` 名がカウントに乗る
- `first_time_count` (integer) — **member 数** (同伴は member 化されていないため初回判定の対象外)。`COUNT(*) FILTER (status IN ('reserved', 'attended') AND is_first_time)`。`is_first_time` は「当該 member が当該 event.start_at より前に他イベントで `status = 'attended'` を持たない」場合に true
- `waitlist_count` (integer) — **本人 + 同伴を含む人数**。`SUM(1 + guest_count) FILTER (status = 'waitlist')` (MVP1 では 0 が返る運用)
- `created_at` / `updated_at` (timestamptz) — events 由来

view は events × venues の `LEFT JOIN` と、reservations の集計サブクエリ（`COUNT(*) FILTER (...)` 4 種）を持つ。view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM event_detail_view WHERE id = '<uuid>'` を実行
- **THEN** 上記の全列を含む 1 行が返る

#### Scenario: 予約数 / チェックイン人数の集計（同伴含む）
- **WHEN** ある event に対して `status = 'reserved'` の reservations が 12 件 (うち 1 件は guest_count=1)、`status = 'cancelled'` が 2 件、`status = 'attended'` が 4 件 (うち 1 件は guest_count=2) 存在する
- **THEN** `reserved_count` は **(12 + 1) + (4 + 2) = 19 名** (active な予約全件 × 本人+同伴)、`checked_in_count` は **4 + 2 = 6 名** (attended のみ × 本人+同伴) を返す。cancelled は除外。

#### Scenario: チェックイン操作で予約数は不変
- **WHEN** 上記状態から 1 件チェックイン (`status='reserved' → 'attended'`、当該 reservation の guest_count=0)
- **THEN** `reserved_count` は **19 のまま**（active な予約は減らない）、`checked_in_count` は **6 + 1 = 7 名** に増える

#### Scenario: first_time_count の集計（member 数ベース）
- **WHEN** ある event の active 予約 16 件のうち、過去に他イベントで attended 履歴がない member が 2 名いる（同伴者数は問わない）
- **THEN** 当該 event の `first_time_count` は 2 を返す。同伴者は member 化されていないため初回判定の対象外。

#### Scenario: waitlist_count の集計（MVP1 想定）
- **WHEN** ある event に `status = 'waitlist'` の reservations が 0 件
- **THEN** 当該 event の `waitlist_count` は 0 を返す

#### Scenario: 同伴者数の更新が集計に反映される
- **WHEN** admin が ある reservation (status='reserved', guest_count=0) の `guest_count` を 0 → 2 に UPDATE
- **THEN** `reserved_count` が +2 増える（本人は元々カウント済みのため、増分は同伴 2 名分のみ）

#### Scenario: fee の COALESCE
- **WHEN** events.fee が NULL で venues.default_fee が 1000 の event 行
- **THEN** view の `fee` 列は 1000 を返す

#### Scenario: 存在しない id
- **WHEN** 存在しない uuid で `SELECT * FROM event_detail_view WHERE id = '<missing-uuid>'` を実行
- **THEN** 0 行返る（エラーにはならない）

### Requirement: event_participants_view ビュー

システムは MUST `event_participants_view` という SQL view を提供する。本 view は admin の `/events/:id` 画面が単一クエリで参加者一覧を取得するための DTO として機能し、以下の列を返す:

- `reservation_id` (uuid) — reservations.id
- `event_id` (uuid) — reservations.event_id
- `member_id` (uuid) — reservations.member_id
- `display_name` (text) — members.display_name
- `email` (text) — members.email
- `experience_level` (text) — members.experience_level（'beginner' / 'intermediate' / 'experienced'）
- `guest_count` (smallint) — reservations.guest_count
- `status` (text) — reservations.status
- `checked_in_at` (timestamptz) — reservations.checked_in_at（NULL = 未チェックイン）
- `created_at` (timestamptz) — reservations.created_at（予約日時）
- `is_first_time` (boolean) — 「当該 member が当該 event.start_at より前に他イベントで `status = 'attended'` を持たない」場合に true

view は reservations × members × events の INNER JOIN（events は start_at 比較用）と、`is_first_time` 計算用の `NOT EXISTS` サブクエリを持つ。view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

`status = 'cancelled'` の行は本 view に含めない MUST（admin 画面の参加者一覧は active な予約のみを表示するため）。`status IN ('reserved', 'attended', 'no_show', 'waitlist')` の行のみ返す SHALL。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM event_participants_view WHERE event_id = '<uuid>'` を実行
- **THEN** 上記の全列を含む参加者行が返る

#### Scenario: cancelled 除外
- **WHEN** ある event の reservations に reserved 3 件 + cancelled 2 件 + attended 1 件が存在する
- **THEN** 当該 event_id でフィルタした view から返るのは 4 行（reserved 3 + attended 1）。cancelled 2 件は除外される

#### Scenario: is_first_time が true
- **WHEN** ある member の予約のうち、当該 event より前に他イベントで attended 履歴がゼロ
- **THEN** view の当該行の `is_first_time` は true を返す

#### Scenario: is_first_time が false（過去 attended あり）
- **WHEN** ある member が過去に他イベントで `status = 'attended'` の reservations を 1 件以上持つ（かつそのイベントの start_at が本イベントより前）
- **THEN** view の当該行の `is_first_time` は false を返す

#### Scenario: is_first_time が true（過去 reserved のみ・attended なし）
- **WHEN** ある member が過去に他イベントで `status = 'reserved'` の reservations を持つが、`status = 'attended'` は 1 件もない
- **THEN** view の当該行の `is_first_time` は true を返す（予約だけで来場履歴がないため初回扱い）

#### Scenario: 同一 member の他イベント start_at 比較
- **WHEN** ある member が「本イベントの翌日のイベント」で attended の予約を持つ（時系列的には未来）
- **THEN** その attended は本イベントの初回判定に影響しない。`is_first_time` は他の過去 attended 有無のみで決まる

### Requirement: 新規 view の更新可否

システムは MUST `event_detail_view` および `event_participants_view` を **読み取り専用** として運用する。両 view への INSERT / UPDATE / DELETE は SHALL 発行しない（PostgreSQL の view 仕様により集計列を含む view は更新不可。アプリ側コードはベーステーブル `events` / `reservations` / `members` 経由で書き込む）。

#### Scenario: 集計 view の更新不可
- **WHEN** admin が `INSERT INTO event_detail_view ...` を実行
- **THEN** PostgreSQL から「cannot insert into view」相当のエラーが返る（集計列を含む view の標準動作）
