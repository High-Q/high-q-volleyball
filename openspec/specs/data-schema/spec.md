# Data Schema Spec

## Purpose

High Q の MVP1 で必要な 5 テーブル (events / members / reservations / venues / identity_documents) の論理構造とビジネスルールを規定する。Supabase PostgreSQL で運用し、列定義 / CHECK 制約 / インデックス / Branded Types 対応を含む。
## Requirements
### Requirement: events テーブル

システムは `events` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`name` (text NOT NULL)、`description` (text)、`start_at` (timestamptz NOT NULL)、`end_at` (timestamptz NOT NULL)、`venue_id` (uuid NOT NULL references venues(id) ON DELETE RESTRICT)、`fee` (integer NULL — NULL は会場 default_fee を継承)、`capacity` (smallint NULL)、`visibility` (text CHECK in `'draft'`,`'published'`,`'private'`、default `'draft'`)、`status` (text CHECK in `'scheduled'`,`'cancelled'`,`'closed'`、default `'scheduled'`)、`cancel_deadline` (timestamptz NULL)、`created_at` (timestamptz default now)、`updated_at` (timestamptz default now)、`created_by` (uuid references auth.users(id) ON DELETE SET NULL)。

既存の `location` 列 (free text) は本 change で DROP MUST する (本番 DB は空のため互換維持不要、venue_id への一本化を強制する)。

`visibility` と `status` を分離 MUST: `visibility` は admin の公開ステータス、`status` は実施ステータス (中止 / 終了等)。

#### Scenario: 基本的な作成と取得
- **WHEN** 管理者が name / start_at / end_at を指定して events に行を INSERT
- **THEN** 行が作成され `id` は UUID v4、`created_at` / `updated_at` は now()、`status` は `'scheduled'`、`visibility` は `'draft'` がデフォルトで入る

#### Scenario: 開始 < 終了の制約
- **WHEN** start_at >= end_at の行を INSERT しようとする
- **THEN** CHECK 制約 `start_before_end` 違反でエラーとなる

#### Scenario: capacity の範囲
- **WHEN** capacity が負数または 0 の行を INSERT しようとする
- **THEN** CHECK 制約 `capacity_positive` 違反でエラーとなる (capacity は NULL 許可、NULL は無制限)

#### Scenario: venue_id の参照整合性
- **WHEN** events.venue_id が指す venues の行を DELETE
- **THEN** ON DELETE RESTRICT により venues の削除がエラーになる (events が参照している間は会場削除不可)

#### Scenario: venue_id 未指定の作成は不可
- **WHEN** venue_id を NULL のまま events を INSERT しようとする
- **THEN** NOT NULL 制約違反でエラーとなる (新規作成は必ず venues から選択)

#### Scenario: visibility と status の独立性
- **WHEN** `visibility = 'published'` かつ `status = 'cancelled'` の行を作成
- **THEN** 行は正常に作成される (公開済みだが中止になったイベントを表現)

### Requirement: members テーブル

システムは `members` テーブルを以下の列で定義 MUST する: `id` (UUID PK、auth.users.id と同一値で 1:1 紐付け)、`email` (text UNIQUE NOT NULL、auth.users.email から同期)、`display_name` (text NOT NULL)、`birthday` (date NOT NULL)、`phone` (text NULL)、`experience_level` (text CHECK in `'beginner'`,`'intermediate'`,`'experienced'`、default `'beginner'`)、`role` (text CHECK in `'member'`,`'admin'`、default `'member'`)、`profile` (jsonb default `{}`)、`created_at` / `updated_at` (timestamptz default now)。

#### Scenario: auth.users との 1:1 紐付け
- **WHEN** Supabase Auth で新規ユーザーがサインアップする
- **THEN** トリガー `on_auth_user_created` により `members` に同じ id で行が自動作成される。ただし `display_name` / `birthday` は会員登録フォームで明示入力が必要なため、トリガーは `display_name = ''` / `birthday = current_date` の placeholder で作成し、登録フォーム送信時に UPDATE で正式値を入れる

#### Scenario: 生年月日の必須化
- **WHEN** 会員登録フォームから display_name / birthday 未入力で UPDATE
- **THEN** アプリ側バリデーションで拒否される (DB 側は NOT NULL のため、placeholder からの UPDATE は許容するが空文字 / 不正値はアプリ層で防ぐ)

#### Scenario: 経験レベルの選択
- **WHEN** member が experience_level を 'beginner' / 'intermediate' / 'experienced' のいずれかに UPDATE
- **THEN** 行は更新される。それ以外の値は CHECK 制約違反でエラーとなる

#### Scenario: role の管理
- **WHEN** 管理者ユーザーが `role = 'admin'` の行を直接更新で作成
- **THEN** その members は admin として扱われる (自己昇格は RLS で禁止)

### Requirement: reservations テーブル

システムは `reservations` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`event_id` (uuid NOT NULL references events(id) ON DELETE RESTRICT)、`member_id` (uuid NOT NULL references members(id) ON DELETE RESTRICT)、`status` (text CHECK in `'reserved'`,`'cancelled'`,`'attended'`,`'no_show'`,`'waitlist'`、default `'reserved'`)、`guest_count` (smallint NOT NULL default 0 CHECK >= 0 AND <= 5)、`phone_at_booking` (text NULL — 予約時点のスナップショット)、`note` (text)、`checked_in_at` (timestamptz NULL — null = 未チェックイン)、`cancelled_at` (timestamptz NULL)、`created_at` / `updated_at` (timestamptz default now)。

`status` enum に `'waitlist'` を追加 MUST (キャンセル待ち管理 #154 用)。

#### Scenario: 1 イベント・1 会員に対して 1 予約
- **WHEN** 同じ (event_id, member_id) で 2 件目の reservations を INSERT
- **THEN** UNIQUE 制約違反でエラーとなる (キャンセル後の再予約は status の更新で対応)

#### Scenario: events と members の参照整合性
- **WHEN** reservations が指す events または members を DELETE
- **THEN** ON DELETE RESTRICT により削除がエラーになる (履歴保護)

#### Scenario: 同伴者数の範囲
- **WHEN** guest_count が負数または 6 以上の行を INSERT
- **THEN** CHECK 制約違反でエラーとなる (0 〜 5 の範囲のみ許容)

#### Scenario: チェックイン操作
- **WHEN** 管理者が checked_in_at を now() に UPDATE
- **THEN** 行は更新され、UI 側で「済」表示になる (UPDATE 権限は RLS で admin のみ)

#### Scenario: キャンセル時のタイムスタンプ
- **WHEN** member or admin が status を 'cancelled' に変更
- **THEN** トリガー `set_reservations_cancelled_at` により cancelled_at が now() に自動設定される

### Requirement: updated_at の自動更新

システムは MUST events / members / reservations の `updated_at` 列を行更新時に自動で `now()` に書き換えるトリガー `set_updated_at()` を持つ。

#### Scenario: UPDATE 時の自動更新
- **WHEN** 任意の行を UPDATE する
- **THEN** `updated_at` が現在時刻に更新される（明示的に指定した値があっても上書き）

### Requirement: インデックス

システムは検索性能のため以下のインデックスを作成 MUST する:
- `events`: `start_at` の B-tree (カレンダー表示の月絞り込み)、`status` の partial index where `status = 'scheduled'`、`venue_id` の B-tree (会場別フィルタ)
- `reservations`: `event_id`、`member_id`、`(member_id, status)` の B-tree、`(event_id, status)` の B-tree (満員判定用)
- `members`: `email` の UNIQUE (PK 由来で自動)
- `venues`: `name` の UNIQUE、`is_primary` の partial unique where `is_primary = true`
- `identity_documents`: `member_id` の B-tree、`status` の partial index where `status = 'pending'` (admin レビュー一覧用)

#### Scenario: カレンダーのレンジクエリ
- **WHEN** `WHERE start_at >= '2026-04-01' AND start_at < '2026-05-01'` で events を検索
- **THEN** index on `start_at` を使ったプランで返る (EXPLAIN 確認)

#### Scenario: pending レビュー一覧
- **WHEN** admin が `WHERE status = 'pending'` で identity_documents を検索
- **THEN** partial index を使ったプランで返る

### Requirement: Branded Types との対応

システムは TypeScript 側で各テーブルの id 列を以下の Branded Types として表現 MUST する: `EventId` / `MemberId` / `ReservationId` / `VenueId` / `IdentityDocumentId`。各テーブルの行型は `Event` / `Member` / `Reservation` / `Venue` / `IdentityDocument` という型エイリアスで提供 SHALL する。

#### Scenario: 型エイリアスから列名取得
- **WHEN** `Event['start_at']` を参照
- **THEN** `string` (ISO 8601 文字列) として型付けされる (Date オブジェクトへの変換は呼び出し側責任)

#### Scenario: VenueId と EventId の混入防止
- **WHEN** `EventId` を期待する関数に `VenueId` を渡す
- **THEN** 型エラーとなりコンパイルが通らない

### Requirement: マイナンバーカード収集禁止

システムは個人識別番号 (マイナンバー) を**テキストとして**保管する列を作成 MUST NOT (禁止)。ただし、本人確認書類としての**マイナンバーカード画像**は、個人番号 12 桁が完全にマスクされていることを前提に受け付け SHALL する。

マスクの担保はアプリ側 UX (注意喚起 + サンプル画像 + チェックボックス同意) と admin レビュー (#171) の併用で行 MUST。マスク漏れが発覚した画像は admin が即時削除する SOP を `docs/06-品質・セキュリティ/` に定義 MUST する。

#### Scenario: スキーマレビュー
- **WHEN** 任意のテーブルに `my_number` / `mynumber` / `individual_number` 等の**列**が含まれる
- **THEN** Design レビューで却下される

#### Scenario: マスク済み画像の受付
- **WHEN** identity_documents に `document_type = 'my_number_card_masked'` の行が作成される
- **THEN** 行は受け付ける (アプリ層で同意チェックボックス必須、admin レビューでマスク不十分なら status='rejected' + Storage 削除)

#### Scenario: 通知カードは不可
- **WHEN** identity_documents に `document_type = 'my_number_notification_card'` を作成しようとする
- **THEN** CHECK 制約違反でエラーとなる (通知カードは本人確認書類として無効)

### Requirement: venues テーブル

システムは `venues` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`name` (text NOT NULL)、`address` (text)、`default_fee` (integer NULL — NULL は会場側で都度決定)、`access_note` (text)、`map_url` (text)、`is_primary` (boolean default false)、`created_at` / `updated_at` (timestamptz default now)。

#### Scenario: 主要 5 会場の seed 投入
- **WHEN** migration 適用直後
- **THEN** 以下の 5 行が初期データとして投入されている (具体値は design.md D9 を正とする):
  - 亀戸スポーツセンター (江東区亀戸 8-22-1, default_fee=1000)
  - 東砂スポーツセンター (江東区東砂 4-24-1, default_fee=1000)
  - 深川スポーツセンター (江東区越中島 1-2-18, default_fee=1000)
  - 深川北スポーツセンター (江東区平野 3-2-20, default_fee=1000)
  - 有明会場 (江東区有明 1-8-14 先, default_fee=500, is_primary=true — 実会場の校名は DB に保管せず駅住所のみ)

#### Scenario: 有明会場の場所秘匿
- **WHEN** 未認証ユーザーが LP / 予約サイトで venues.address を取得
- **THEN** 有明会場は駅住所 (江東区有明 1-8-14 先) のみが返る。実際の会場 (近隣の小学校) は予約確定メール (#148) で初めて伝達される

#### Scenario: メイン会場フラグ
- **WHEN** `is_primary = true` の会場を 2 件以上作成しようとする
- **THEN** `venues_single_primary_idx` の partial unique index 違反でエラーとなる (メイン会場は最大 1 件)

#### Scenario: 名称の重複防止
- **WHEN** 同名の venues を 2 件 INSERT しようとする
- **THEN** UNIQUE 制約 `venues_name_key` 違反でエラーとなる

### Requirement: identity_documents テーブル

システムは `identity_documents` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`member_id` (uuid NOT NULL references members(id) ON DELETE CASCADE)、`document_type` (text CHECK in 10 種類)、`storage_path_front` (text NOT NULL — Supabase Storage 内の表面画像キー)、`storage_path_back` (text NULL — Supabase Storage 内の裏面画像キー、任意提出時のみ値を持つ)、`status` (text CHECK in `'pending'`,`'approved'`,`'rejected'`、default `'pending'`)、`rejection_reason` (text NULL)、`uploaded_at` (timestamptz default now)、`reviewed_at` (timestamptz NULL — null = 未確認)、`reviewed_by` (uuid NULL references members(id) ON DELETE SET NULL)。

`document_type` の許容値は次の 10 種類: `'drivers_license'` / `'driving_history_cert'` / `'residence_certificate'` / `'disability_certificate'` / `'residence_card'` / `'special_permanent_resident_cert'` / `'student_id'` / `'passport'` / `'my_number_card_masked'` / `'health_insurance_cert'`。

旧 `storage_path` 列 (text NOT NULL) は本 change で `storage_path_front` に RENAME MUST する (本番 DB は 0 行のため互換維持不要)。`storage_path_back` は新規追加列で、表裏 2 ファイル提出時の裏面パスを保持する SHALL。

#### Scenario: 表面のみの提出
- **WHEN** `INSERT INTO identity_documents (member_id, document_type, storage_path_front, status) VALUES (?, 'drivers_license', '<uid>/<doc-id>-front.jpg', 'pending')`
- **THEN** 行が作成され、`storage_path_back` は NULL のまま (任意提出のため)

#### Scenario: 表裏両面の提出
- **WHEN** `INSERT INTO identity_documents (member_id, document_type, storage_path_front, storage_path_back, status) VALUES (?, 'drivers_license', '<uid>/<doc-id>-front.jpg', '<uid>/<doc-id>-back.jpg', 'pending')`
- **THEN** 行が作成され、表裏両方のパスが 1 行で保持される

#### Scenario: 表面パス省略は不可
- **WHEN** `storage_path_front` を NULL のまま INSERT しようとする
- **THEN** NOT NULL 制約違反でエラーとなる (表面は常に必須)

#### Scenario: 画像本体は別管理
- **WHEN** identity_documents 行を作成
- **THEN** 列に画像 BLOB は持たず、`storage_path_front` / `storage_path_back` から Supabase Storage `identity-documents` バケット内のオブジェクトを参照する

#### Scenario: マスク済みマイナンバーカードは受付可
- **WHEN** `document_type = 'my_number_card_masked'` で行を作成
- **THEN** 行は正常に作成される (個人番号 12 桁マスク済み画像であることはアプリ側 UX とレビュー運用で担保)

#### Scenario: マイナンバーカード通知カードは受付不可
- **WHEN** document_type に `'my_number_notification_card'` を指定して INSERT
- **THEN** CHECK 制約違反でエラーとなる

#### Scenario: 削除時の連鎖
- **WHEN** members の行を DELETE
- **THEN** その member の identity_documents 行も ON DELETE CASCADE で削除される (Storage 側のオブジェクト削除はアプリ層 SOP で別途実施)

### Requirement: Storage バケット identity-documents

システムは Supabase Storage に `identity-documents` という private バケットを作成 MUST する。バケット内のオブジェクト名は `<member_id>/<document_id>-(front|back).<ext>` 形式で命名 SHALL する。表面オブジェクトは常に存在し、裏面オブジェクトは任意 (`storage_path_back IS NOT NULL` のときのみ存在) SHALL する。

#### Scenario: 公開アクセス禁止
- **WHEN** 未認証ユーザーが バケット内オブジェクトに直接 URL でアクセス
- **THEN** 403 Forbidden が返る (バケット public フラグは false)

#### Scenario: ファイル名の安全性
- **WHEN** アプリが画像を upload する
- **THEN** ファイル名は `<member_id>/<document_id>-(front|back).(jpg|png|heic|heif)` 形式に正規化される (member_id をディレクトリ階層に持たせ RLS と整合)

#### Scenario: 表裏のペアリング
- **WHEN** 同じ `<document_id>` で `<...>-front.jpg` と `<...>-back.jpg` がアップロードされる
- **THEN** 両者は同一の `identity_documents.id` 行の `storage_path_front` / `storage_path_back` から参照され、admin レビューで対応関係が一意に判定可能

#### Scenario: 裏面のみ削除 (将来 Phase)
- **WHEN** admin が `storage_path_back` の Storage オブジェクトのみを削除し、DB 上 `storage_path_back = NULL` に UPDATE
- **THEN** 表面のみ提出として扱われる (本 change のスコープ外、Phase 2 で admin 機能として検討)

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
- `reserved_count` (integer) — `reservations` のうち `event_id = events.id` かつ `status = 'reserved'` の件数
- `created_at` / `updated_at` (timestamptz) — events 由来

view は events × venues の `LEFT JOIN`（venues 削除時の参照整合性は events.venue_id の `ON DELETE RESTRICT` で保証されているが、view 自体は LEFT JOIN で耐性を持たせる）と、reservations の集計サブクエリ（`COUNT(*) FILTER (WHERE status = 'reserved')`）を持つ。view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM event_list_view LIMIT 1` を実行
- **THEN** 上記の全列が返る

#### Scenario: 残席数が正しく集計される
- **WHEN** ある event に対して `status = 'reserved'` の reservations が 3 件、`status = 'cancelled'` が 2 件存在する
- **THEN** 当該 event の `reserved_count` は 3 を返す

#### Scenario: fee の COALESCE
- **WHEN** events.fee が NULL で venues.default_fee が 1000 の event 行
- **THEN** view の `fee` 列は 1000 を返す

#### Scenario: venue 削除耐性
- **WHEN** events.venue_id が指す venues 行が（理論上）削除された場合
- **THEN** event_list_view は当該 event の行を `venue_name = NULL` で返す（実運用では venues 削除は ON DELETE RESTRICT で拒否されるため到達しない安全網）

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

