## ADDED Requirements

### Requirement: get_event_availability 関数（会員サイト用 予約埋まり具合 集計）

システムは `public.get_event_availability(p_event_ids uuid[])` という SQL 関数を MUST 提供する。本関数は会員サイト (`apps/reservation`) と LP (`apps/lp`) が予約埋まり具合の集計値を取得するための DTO として機能し、admin 用の `event_list_view` / `event_detail_view` と契約境界を明確に分離する。従来の `event_availability_view` を置き換える（Supabase Advisor の SECURITY DEFINER view 検知を解消するため view を関数化する）。

返す列（`p_event_ids` に含まれる各 `events.id` ごとに 1 行）:

- `event_id` (uuid) — events.id への参照
- `capacity` (int) — events.capacity をそのまま返す（client 側で動的ラベル判定に使用。NULL 可）
- `reserved_count` (integer) — **本人 + 同伴を含む人数**。`SUM(1 + guest_count) FILTER (status IN ('reserved', 'attended'))`。チェックイン操作で `status` が `'reserved' → 'attended'` に変わっても両方とも filter にヒットするため**減らない**。`cancelled` は除外。**admin の `event_detail_view.reserved_count` と同一の集計ロジック** SHALL を共有する

関数は MUST `SECURITY DEFINER` かつ `set search_path = public` で作成され、関数所有者（postgres ロール）の権限で `reservations` を全件集計する。これにより会員 (`reservations` の SELECT RLS で自分の予約しか見えない権限) からの呼び出しでも、全件集計を漏れなく返す。同時に、関数が返す列は集計のみで個人情報（予約者 ID / member 名 / 個別予約行）を一切含まない MUST。

関数は admin 用 `event_list_view` / `event_detail_view` とは独立に運用 MUST し、admin 側のクエリは本変更で **改変 SHALL NOT** する（admin 専用契約を維持）。

集計対象は `p_event_ids` に含まれる `events` 行 SHALL する（公開ステータス / 開催日時のフィルタは関数内では行わない MUST。フィルタは呼び出し側でかける）。予約 0 件のイベントも `reserved_count = 0` の行で返す MUST。

#### Scenario: capacity NULL のイベントの集計
- **WHEN** capacity NULL のイベントに対し `reservations` に `(本人 1 + 同伴 0)` の予約が 11 件存在し、その event_id を `p_event_ids` に渡して呼び出す
- **THEN** 当該行の `reserved_count` は **11** を返す。`capacity` は NULL を返す

#### Scenario: capacity あり、同伴ありの集計
- **WHEN** capacity = 18 のイベントに対し `reservations` に `(本人 1 + 同伴 2)` の予約が 1 件、`(本人 1 + 同伴 0)` の予約が 9 件、`(本人 1 + 同伴 1)` の予約が 1 件存在する状態で呼び出す
- **THEN** 当該行の `reserved_count` は **(1+2) + 9 + (1+1) = 14** を返す。`capacity` は 18 を返す

#### Scenario: チェックイン済みも母集団に含む
- **WHEN** あるイベントで `status = 'attended'` の予約が 4 件、`status = 'reserved'` の予約が 12 件、いずれも `guest_count = 0` の状態で呼び出す
- **THEN** 当該行の `reserved_count` は **16** を返す（attended も母集団に含む）

#### Scenario: cancelled は母集団から除外
- **WHEN** あるイベントで `status = 'cancelled'` の予約が 3 件、`status = 'reserved'` の予約が 8 件の状態で呼び出す
- **THEN** 当該行の `reserved_count` は **8** を返す

#### Scenario: 会員ロールから全件集計が返る
- **WHEN** 会員ロール（`is_admin() = false`）で `get_event_availability` を呼び出す
- **THEN** 当該会員以外の予約も含めた全件集計が返る（関数が `SECURITY DEFINER` であるため）

#### Scenario: 個人情報を漏らさない
- **WHEN** `get_event_availability` の戻り値の列定義を確認
- **THEN** member_id / member 名 / reservation_id / created_at 等の個人情報を特定可能な列は存在しない（`event_id` / `capacity` / `reserved_count` のみ）

#### Scenario: admin view との集計同値性
- **WHEN** 任意の event_id に対し `get_event_availability(array[X])` の `reserved_count` と `SELECT reserved_count FROM event_detail_view WHERE id = X` を実行
- **THEN** 両者は同じ値を返す（集計ロジック共有）

#### Scenario: 要求 id ごとに 1 行
- **WHEN** 予約 0 件を含む 10 件の event_id を `p_event_ids` に渡して呼び出す
- **THEN** 10 行を返す（予約 0 件のイベントも `reserved_count = 0` の行で返る）

## REMOVED Requirements

### Requirement: event_availability_view ビュー（会員サイト用 予約埋まり具合 集計）

**Reason**: Supabase Advisor が SECURITY DEFINER view を Critical 検知するため、同一の集計挙動を `SECURITY DEFINER` 関数（`search_path` 固定）へ移し、view を DROP する。集計仕様・返却列・セキュリティ姿勢は不変。
**Migration**: `event_availability_view` を DROP し、代わりに `get_event_availability(p_event_ids uuid[])` 関数を呼ぶ（ADDED: `get_event_availability 関数（会員サイト用 予約埋まり具合 集計）`）。呼び出し側は `.from("event_availability_view").select(...).in("event_id", ids)` を `.rpc("get_event_availability", { p_event_ids: ids })` へ置換する。
