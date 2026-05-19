## MODIFIED Requirements

### Requirement: event_participants_view ビュー

システムは MUST `event_participants_view` という SQL view を提供する。本 view は admin の `/events/:id` 画面が単一クエリで参加者一覧を取得するための DTO として機能し、以下の列を返す:

- `reservation_id` (uuid) — reservations.id
- `event_id` (uuid) — reservations.event_id
- `member_id` (uuid NULL) — reservations.member_id（退会済み会員の予約は NULL）
- `display_name` (text) — `COALESCE(members.display_name, '退会済み会員')`
- `nickname` (text NULL) — `members.nickname`。退会済み会員（`member_id IS NULL`）は常に NULL を返す
- `email` (text NULL) — members.email（退会済み会員は NULL）
- `experience_level` (text NULL) — members.experience_level（退会済み会員は NULL）
- `guest_count` (smallint) — reservations.guest_count
- `status` (text) — reservations.status
- `checked_in_at` (timestamptz) — reservations.checked_in_at（NULL = 未チェックイン）
- `created_at` (timestamptz) — reservations.created_at（予約日時）
- `is_first_time` (boolean) — 「当該 member が当該 event.start_at より前に他イベントで `status = 'attended'` を持たない」場合に true。`member_id IS NULL` の行は **false**（退会済み会員に初回バッジは出さない）

view は reservations × members（LEFT JOIN）× events（INNER JOIN）の組み合わせと、`is_first_time` 計算用の `NOT EXISTS` サブクエリを持つ。`members` を LEFT JOIN にすることで `member_id IS NULL` の行も列挙される MUST。view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

`status = 'cancelled'` の行は本 view に含めない MUST（admin 画面の参加者一覧は active な予約のみを表示するため）。`status IN ('reserved', 'attended', 'no_show', 'waitlist')` の行のみ返す SHALL。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM event_participants_view WHERE event_id = '<uuid>'` を実行
- **THEN** 上記の全列（`nickname` を含む）を含む参加者行が返る

#### Scenario: cancelled 除外
- **WHEN** ある event の reservations に reserved 3 件 + cancelled 2 件 + attended 1 件が存在する
- **THEN** 当該 event_id でフィルタした view から返るのは 4 行（reserved 3 + attended 1）。cancelled 2 件は除外される

#### Scenario: 退会済み会員の過去予約
- **WHEN** ある event の attended 予約の中に、その後退会した会員の予約が 1 件含まれる
- **THEN** view は当該行を `display_name = '退会済み会員'` / `nickname = NULL` / `email = NULL` / `experience_level = NULL` / `member_id = NULL` / `is_first_time = false` で返す

#### Scenario: nickname の返却（あり）
- **WHEN** ある active な予約の `members.nickname = 'たろちゃん'` が設定されている
- **THEN** view の当該行の `nickname` は `'たろちゃん'` を返す。`display_name` は変わらず `members.display_name` の値

#### Scenario: nickname の返却（NULL）
- **WHEN** ある active な予約の `members.nickname IS NULL`
- **THEN** view の当該行の `nickname` は NULL を返す

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
