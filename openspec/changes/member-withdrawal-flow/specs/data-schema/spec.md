## MODIFIED Requirements

### Requirement: reservations テーブル

システムは `reservations` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`event_id` (uuid NOT NULL references events(id) ON DELETE RESTRICT)、`member_id` (uuid NULL references members(id) ON DELETE SET NULL — NULL は退会済み会員の過去予約を匿名化する場合のみ)、`status` (text CHECK in `'reserved'`,`'cancelled'`,`'attended'`,`'no_show'`,`'waitlist'`、default `'reserved'`)、`guest_count` (smallint NOT NULL default 0 CHECK >= 0 AND <= 5)、`phone_at_booking` (text NULL — 予約時点のスナップショット)、`note` (text)、`checked_in_at` (timestamptz NULL — null = 未チェックイン)、`cancelled_at` (timestamptz NULL)、`created_at` / `updated_at` (timestamptz default now)。

`status` enum に `'waitlist'` を追加 MUST (キャンセル待ち管理 #154 用)。

新規 INSERT 時は `member_id IS NOT NULL` を CHECK 制約相当のアプリ層バリデーション + RLS WITH CHECK 句で MUST 強制する。`member_id` が NULL になる経路は **退会実行に伴う ON DELETE SET NULL のみ** であり、それ以外の経路で NULL 行が生まれる SHALL NOT。

`member_id IS NULL` の行は member-withdrawal capability の規定により、退会済み会員の過去予約として残された痕跡である。当該行は `phone_at_booking IS NULL` AND `note IS NULL` を MUST 満たす（退会実行時に member-withdrawal capability が両列を明示的に NULL 化する）。当該行に対する UPDATE / DELETE は admin のみ可能（rls-policies capability に従う）。

#### Scenario: 1 イベント・1 会員に対して 1 予約
- **WHEN** 同じ (event_id, member_id) で 2 件目の reservations を INSERT
- **THEN** UNIQUE 制約違反でエラーとなる (キャンセル後の再予約は status の更新で対応)

#### Scenario: events 参照整合性
- **WHEN** reservations が指す events を DELETE
- **THEN** ON DELETE RESTRICT により削除がエラーになる (履歴保護)

#### Scenario: members 削除時の匿名化
- **WHEN** reservations が指す members を DELETE
- **THEN** ON DELETE SET NULL により当該 reservations 行は残り、`member_id` のみ NULL に書き換わる

#### Scenario: 退会後の個人情報列が NULL
- **WHEN** member-withdrawal Edge Function による退会が完了した後に、当該会員の過去予約行を SELECT
- **THEN** すべての行で `member_id` / `phone_at_booking` / `note` がいずれも NULL である

#### Scenario: 新規予約は member_id 必須
- **WHEN** `member_id IS NULL` で reservations を INSERT
- **THEN** RLS WITH CHECK 句で拒否される (NULL は退会経路でのみ生まれる)

#### Scenario: 同伴者数の範囲
- **WHEN** guest_count が負数または 6 以上の行を INSERT
- **THEN** CHECK 制約違反でエラーとなる (0 〜 5 の範囲のみ許容)

#### Scenario: チェックイン操作
- **WHEN** 管理者が checked_in_at を now() に UPDATE
- **THEN** 行は更新され、UI 側で「済」表示になる (UPDATE 権限は RLS で admin のみ)

#### Scenario: キャンセル時のタイムスタンプ
- **WHEN** member or admin が status を 'cancelled' に変更
- **THEN** トリガー `set_reservations_cancelled_at` により cancelled_at が now() に自動設定される

### Requirement: event_participants_view ビュー

システムは MUST `event_participants_view` という SQL view を提供する。本 view は admin の `/events/:id` 画面が単一クエリで参加者一覧を取得するための DTO として機能し、以下の列を返す:

- `reservation_id` (uuid) — reservations.id
- `event_id` (uuid) — reservations.event_id
- `member_id` (uuid NULL) — reservations.member_id（退会済み会員の予約は NULL）
- `display_name` (text) — `COALESCE(members.display_name, '退会済み会員')`
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
- **THEN** 上記の全列を含む参加者行が返る

#### Scenario: cancelled 除外
- **WHEN** ある event の reservations に reserved 3 件 + cancelled 2 件 + attended 1 件が存在する
- **THEN** 当該 event_id でフィルタした view から返るのは 4 行（reserved 3 + attended 1）。cancelled 2 件は除外される

#### Scenario: 退会済み会員の過去予約
- **WHEN** ある event の attended 予約の中に、その後退会した会員の予約が 1 件含まれる
- **THEN** view は当該行を `display_name = '退会済み会員'` / `email = NULL` / `experience_level = NULL` / `member_id = NULL` / `is_first_time = false` で返す

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

### Requirement: member_history_view ビュー

システムは MUST `member_history_view` という SQL view を提供する。本 view は admin の `/members` 画面の詳細 sheet が単一クエリで会員の参加履歴を取得するための DTO として機能し、以下の列を返す:

- `reservation_id` (uuid) — reservations.id
- `member_id` (uuid) — reservations.member_id
- `event_id` (uuid) — reservations.event_id
- `event_name` (text) — events.name
- `start_at` (timestamptz) — events.start_at
- `venue_name` (text) — venues.name（events.venue_id 経由）
- `status` (text) — reservations.status
- `guest_count` (smallint) — reservations.guest_count
- `checked_in_at` (timestamptz) — reservations.checked_in_at（NULL = 未チェックイン）
- `is_first_time` (boolean) — 当該 member が当該 event.start_at より前に他イベントで `status = 'attended'` を持たない場合に true

view は reservations × events × venues の INNER JOIN を持つ。`status = 'cancelled'` の行は本 view に含めない MUST（admin の詳細 sheet 参加履歴は active な予約のみを表示するため）。`reservations.member_id IS NULL` の行も MUST 含めない（退会済み会員の予約は会員詳細 sheet からは見えなくなる）。`status IN ('reserved', 'attended', 'no_show', 'waitlist')` AND `member_id IS NOT NULL` の行のみ返す SHALL。

`is_first_time` の判定は `event_participants_view` と同一ロジック（`NOT EXISTS` サブクエリで「過去 attended ゼロ」を判定）を採用 MUST。

view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM member_history_view WHERE member_id = '<uuid>'` を実行
- **THEN** 上記の全列を含む参加履歴行が返る

#### Scenario: cancelled 除外
- **WHEN** ある member の reservations に reserved 3 件 + cancelled 2 件 + attended 1 件が存在する
- **THEN** 当該 member_id でフィルタした view から返るのは 4 行（reserved 3 + attended 1）。cancelled 2 件は除外される

#### Scenario: 退会済み予約の除外
- **WHEN** reservations テーブルに `member_id IS NULL` の行が存在する
- **THEN** 当該行は view から返らない（admin の詳細 sheet には現れない）

#### Scenario: 時系列降順での取得
- **WHEN** admin が `SELECT * FROM member_history_view WHERE member_id = :id ORDER BY start_at DESC` を実行
- **THEN** start_at の新しい順で並ぶ

#### Scenario: is_first_time の判定
- **WHEN** ある member の最も古い attended 行を SELECT
- **THEN** 当該行の `is_first_time = true`（過去 attended ゼロ）

#### Scenario: 参加履歴ゼロ
- **WHEN** ある member に `status IN ('reserved', 'attended', 'no_show', 'waitlist')` の予約が 0 件
- **THEN** 当該 member_id でフィルタした view は 0 行返る

## ADDED Requirements

### Requirement: members 削除時の連鎖整合性

システムは `members` テーブルの行が DELETE された際に、以下の連鎖整合性を MUST 保証する:

- `identity_documents` は既存の `ON DELETE CASCADE` により連鎖削除される
- `reservations` は新規 `ON DELETE SET NULL` により残存し、`member_id` のみ NULL に書き換わる
- 連鎖前に Supabase Storage の `identity-documents/<member_id>/` 配下のオブジェクト群は別途明示削除されることを前提とする（DB 制約からは Storage に到達できないため、アプリ層 / Edge Function 側の責務）

`members.id` を参照する他テーブル（既存 / 将来追加）を新設する場合、`ON DELETE` 動作は明示的に SET NULL / CASCADE / RESTRICT のいずれかを設計時に SHALL 決定する。デフォルトの暗黙挙動に委ねる SHALL NOT。

#### Scenario: members DELETE で identity_documents が連鎖削除
- **WHEN** `DELETE FROM members WHERE id = :id` を実行
- **THEN** 当該 member_id を持つ `identity_documents` 行も同トランザクション内で削除される

#### Scenario: members DELETE で reservations.member_id が NULL 化
- **WHEN** `DELETE FROM members WHERE id = :id` を実行
- **THEN** 当該 member_id を持つ `reservations` 行は残り、`member_id` は NULL に書き換わる
