## ADDED Requirements

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

システムは `identity_documents` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`member_id` (uuid NOT NULL references members(id) ON DELETE CASCADE)、`document_type` (text CHECK in 10 種類)、`storage_path` (text NOT NULL — Supabase Storage 内のキー)、`status` (text CHECK in `'pending'`,`'approved'`,`'rejected'`、default `'pending'`)、`rejection_reason` (text NULL)、`uploaded_at` (timestamptz default now)、`reviewed_at` (timestamptz NULL — null = 未確認)、`reviewed_by` (uuid NULL references members(id) ON DELETE SET NULL)。

`document_type` の許容値は次の 10 種類: `'drivers_license'` / `'driving_history_cert'` / `'residence_certificate'` / `'disability_certificate'` / `'residence_card'` / `'special_permanent_resident_cert'` / `'student_id'` / `'passport'` / `'my_number_card_masked'` / `'health_insurance_cert'`。

#### Scenario: 画像本体は別管理
- **WHEN** identity_documents 行を作成
- **THEN** 列に画像 BLOB は持たず、`storage_path` から Supabase Storage `identity-documents` バケット内のオブジェクトを参照する

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

システムは Supabase Storage に `identity-documents` という private バケットを作成 MUST する。バケット内のオブジェクト名は `<member_id>/<document_id>-<front|back>.<ext>` 形式で命名 SHALL する。

#### Scenario: 公開アクセス禁止
- **WHEN** 未認証ユーザーが バケット内オブジェクトに直接 URL でアクセス
- **THEN** 403 Forbidden が返る (バケット public フラグは false)

#### Scenario: ファイル名の安全性
- **WHEN** アプリが画像を upload する
- **THEN** ファイル名は `<member_id>/<document_id>-(front|back).(jpg|png|heic)` 形式に正規化される (member_id をディレクトリ階層に持たせ RLS と整合)

## MODIFIED Requirements

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

### Requirement: マイナンバー個人番号の保管禁止

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
