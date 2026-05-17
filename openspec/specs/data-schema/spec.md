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

システムは `members` テーブルを以下の列で定義 MUST する: `id` (UUID PK、auth.users.id と同一値で 1:1 紐付け)、`email` (text UNIQUE NOT NULL、auth.users.email から同期)、`display_name` (text NOT NULL)、`nickname` (text NULL — 会員サイト上での自己呼称、任意)、`birthday` (date NOT NULL)、`phone` (text NULL)、`experience_level` (text CHECK in `'beginner'`,`'intermediate'`,`'experienced'`、default `'beginner'`)、`role` (text CHECK in `'member'`,`'admin'`、default `'member'`)、`profile` (jsonb default `{}`)、`admin_note` (text NULL — 運営側メモ、admin のみ閲覧・編集)、`created_at` / `updated_at` (timestamptz default now)。

本 change 適用後、新規会員の作成経路は **Edge Function `verify-signup` 経由のみ** となる SHALL。トリガー `on_auth_user_created` は引き続き存在するが、本フローでは Function 内で同一トランザクションで正式値に UPSERT 上書きされるため、placeholder 行が観測されることは SHALL NOT 起きる。Phase 1 で作成済みの既存会員行は変更されず互換性を保つ MUST。

`admin_note` 列は本 change で追加 MUST する。NULL 許容、DB レベルの CHECK 制約は付与 MUST NOT する（長さ制限はアプリ層で 500 文字）。新規会員作成時は NULL のまま作成され、admin が `/members` 画面の詳細 sheet 経由で UPDATE するときのみ値が入る。本人（非 admin）からの UPDATE は RLS WITH CHECK 句で拒否される（`rls-policies` capability に従う）。

#### Scenario: 新規会員行の作成経路
- **WHEN** 本 change 適用後に `auth.users` への INSERT が発生する
- **THEN** その経路は Edge Function `verify-signup` 内の admin API 呼び出しのみであり、`signup_pending` の payload で `members` 行も即座に正式値で埋まる

#### Scenario: トリガー by-product の placeholder 行は観測されない
- **WHEN** 本 change 適用後の任意のタイミングで `members` を SELECT する
- **THEN** `display_name = ''` または `birthday = current_date` の placeholder 状態の行は存在しない

#### Scenario: admin の placeholder 創出（既存運用）
- **WHEN** Supabase Dashboard 経由で admin ユーザーを auth.users に手動追加する（運用作業）
- **THEN** その admin ユーザーは Edge Function を経由しないため `members` 行はトリガーで placeholder として作成され、運用手順に従って `role = 'admin'` + `profile.signup_completed = true` を手動セットする（既存運用と同等）

#### Scenario: admin_note 列のデフォルト
- **WHEN** 任意の経路で新規 members 行が作成される
- **THEN** `admin_note` は NULL で作成される（明示的に値を指定する経路は存在しない）

#### Scenario: admin による admin_note の更新
- **WHEN** admin が `UPDATE members SET admin_note = '左利き / 体験申込' WHERE id = :id` を発行
- **THEN** 1 行更新される（admin の UPDATE 権限は RLS で全件 / 全列許容）

#### Scenario: admin_note の空文字 / NULL 復元
- **WHEN** admin が `UPDATE members SET admin_note = NULL WHERE id = :id` を発行
- **THEN** 1 行更新され、`admin_note IS NULL` 状態に戻る

### Requirement: reservations テーブル

システムは `reservations` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`event_id` (uuid NOT NULL references events(id) ON DELETE CASCADE)、`member_id` (uuid NULL references members(id) ON DELETE SET NULL — NULL は退会済み会員の過去予約を匿名化する場合のみ)、`status` (text CHECK in `'reserved'`,`'cancelled'`,`'attended'`,`'no_show'`,`'waitlist'`、default `'reserved'`)、`guest_count` (smallint NOT NULL default 0 CHECK >= 0 AND <= 5)、`phone_at_booking` (text NULL — 予約時点のスナップショット)、`note` (text)、`checked_in_at` (timestamptz NULL — null = 未チェックイン)、`cancelled_at` (timestamptz NULL)、`created_at` / `updated_at` (timestamptz default now)。

`status` enum に `'waitlist'` を追加 MUST (キャンセル待ち管理 #154 用)。

新規 INSERT 時は `member_id IS NOT NULL` を CHECK 制約相当のアプリ層バリデーション + RLS WITH CHECK 句で MUST 強制する。`member_id` が NULL になる経路は **退会実行に伴う ON DELETE SET NULL のみ** であり、それ以外の経路で NULL 行が生まれる SHALL NOT。

`member_id IS NULL` の行は member-withdrawal capability の規定により、退会済み会員の過去予約として残された痕跡である。当該行は `phone_at_booking IS NULL` AND `note IS NULL` を MUST 満たす（退会実行時に member-withdrawal capability が両列を明示的に NULL 化する）。当該行に対する UPDATE / DELETE は admin のみ可能（rls-policies capability に従う）。

`event_id` の FK を `ON DELETE CASCADE` とする理由: イベント本体が削除された時点で当該予約は実体を失う。admin の削除操作は AlertDialog 二段階確認 + 予約内訳の事前表示で誤操作を防いでおり、DB レベルの RESTRICT による追加防御は不要と判断する。本変更により orphan な reservations 行（cancelled / no_show を含む）が残る経路が排除される。

#### Scenario: 1 イベント・1 会員に対して 1 予約
- **WHEN** 同じ (event_id, member_id) で 2 件目の reservations を INSERT
- **THEN** UNIQUE 制約違反でエラーとなる (キャンセル後の再予約は status の更新で対応)

#### Scenario: events 削除時の連鎖削除
- **WHEN** reservations が指す events を DELETE
- **THEN** ON DELETE CASCADE により当該 event に紐づく全 reservations 行（reserved / cancelled / attended / no_show / waitlist いずれも）が同時に削除される

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

システムは TypeScript 側で各テーブルの id 列を以下の Branded Types として表現 MUST する: `EventId` / `MemberId` / `ReservationId` / `VenueId` / `IdentityDocumentId`。各テーブルの行型は `Event` / `Member` / `Reservation` / `Venue` / `IdentityDocument` という型エイリアスで提供 SHALL する。`Member` 型は本 change で追加された任意の `nickname` 属性（`string | null`）を MUST 含む。

#### Scenario: 型エイリアスから列名取得
- **WHEN** `Event['start_at']` を参照
- **THEN** `string` (ISO 8601 文字列) として型付けされる (Date オブジェクトへの変換は呼び出し側責任)

#### Scenario: VenueId と EventId の混入防止
- **WHEN** `EventId` を期待する関数に `VenueId` を渡す
- **THEN** 型エラーとなりコンパイルが通らない

#### Scenario: Member 型に nickname が含まれる
- **WHEN** `Member['nickname']` を参照
- **THEN** `string | null` として型付けされる（任意属性のため null 許容）

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

システムは `identity_documents` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`member_id` (uuid NOT NULL references members(id) ON DELETE CASCADE)、`document_type` (text CHECK in 10 種類)、`storage_path_front` (text NULL — Supabase Storage 内の表面画像キー、INSERT 時はアプリ層で必須、admin マスク漏れ削除時のみ NULL になる)、`storage_path_back` (text NULL — Supabase Storage 内の裏面画像キー、任意提出時のみ値を持つ)、`status` (text CHECK in `'pending'`,`'approved'`,`'rejected'`、default `'pending'`)、`rejection_reason` (text NULL)、`uploaded_at` (timestamptz default now)、`reviewed_at` (timestamptz NULL — null = 未確認)、`reviewed_by` (uuid NULL references members(id) ON DELETE SET NULL)。

`document_type` の許容値は次の 10 種類: `'drivers_license'` / `'driving_history_cert'` / `'residence_certificate'` / `'disability_certificate'` / `'residence_card'` / `'special_permanent_resident_cert'` / `'student_id'` / `'passport'` / `'my_number_card_masked'` / `'health_insurance_cert'`。

旧 `storage_path` 列 (text NOT NULL) は #92 の change で `storage_path_front` に RENAME 済 (本番 DB は当時 0 行のため互換維持不要)。`storage_path_back` は #92 で新規追加された列で、表裏 2 ファイル提出時の裏面パスを保持する SHALL。

`storage_path_front` の NOT NULL 制約は本 change (#171 admin レビュー) で **解除** MUST する。理由: admin の「マスク漏れ即時削除」操作で Storage オブジェクト削除と同期して DB 列を NULL に設定し、「削除済みマーカー」として運用するため。アプリ層 (reservation 側 #92 の `useUploadIdentityDocument`) は INSERT 時に常に非 NULL を渡すため、通常運用で `storage_path_front IS NULL` となるのは admin マスク漏れ削除後のみ。

#### Scenario: 表面のみの提出
- **WHEN** `INSERT INTO identity_documents (member_id, document_type, storage_path_front, status) VALUES (?, 'drivers_license', '<uid>/<doc-id>-front.jpg', 'pending')`
- **THEN** 行が作成され、`storage_path_back` は NULL のまま (任意提出のため)

#### Scenario: 表裏両面の提出
- **WHEN** `INSERT INTO identity_documents (member_id, document_type, storage_path_front, storage_path_back, status) VALUES (?, 'drivers_license', '<uid>/<doc-id>-front.jpg', '<uid>/<doc-id>-back.jpg', 'pending')`
- **THEN** 行が作成され、表裏両方のパスが 1 行で保持される

#### Scenario: 表面パス省略は INSERT 時には禁止 (アプリ層責務)
- **WHEN** `storage_path_front` を NULL のまま INSERT する
- **THEN** DB 制約上は許容される (NULL 可) が、アプリ層 (reservation / admin) は INSERT 時に必ず非 NULL を渡す責務を持つ。NULL になり得るのは admin マスク漏れ削除後の UPDATE のみ

#### Scenario: マスク漏れ削除済の状態
- **WHEN** admin がマイナンバー画像のマスク漏れを発見し、Storage オブジェクト削除と同時に `UPDATE identity_documents SET storage_path_front = NULL, storage_path_back = NULL, status = 'rejected', rejection_reason = '個人番号がマスクされていないため削除しました。再提出をお願いします' WHERE id = :id` を発行
- **THEN** 行は更新され、`storage_path_front IS NULL` で「Storage オブジェクト削除済」を表現する。一覧 / 詳細画面では「画像は削除済みです」表示として扱われる

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

### Requirement: 新規 view の更新可否

システムは MUST `event_detail_view`、`event_participants_view`、`member_list_view`、および `member_history_view` を **読み取り専用** として運用する。これら view への INSERT / UPDATE / DELETE は SHALL 発行しない（PostgreSQL の view 仕様により集計列を含む view は更新不可。アプリ側コードはベーステーブル `events` / `reservations` / `members` / `venues` 経由で書き込む）。

#### Scenario: 集計 view の更新不可
- **WHEN** admin が `INSERT INTO event_detail_view ...` を実行
- **THEN** PostgreSQL から「cannot insert into view」相当のエラーが返る（集計列を含む view の標準動作）

#### Scenario: member_list_view の更新不可
- **WHEN** admin が `INSERT INTO member_list_view ...` を実行
- **THEN** PostgreSQL から「cannot insert into view」相当のエラーが返る

### Requirement: signup_pending テーブル

システムは `signup_pending` テーブルを以下の要件で定義 MUST する:

- 主キー / ユニーク制約: メールアドレス（同 email の同時保留行は 1 件のみ。再送時は上書き）
- 列構成（論理）:
  - メールアドレス（必須・形式チェックは Edge Function 側で実施）
  - 入力 payload を保持する jsonb 列 1 つ（氏名 / 生年月日 / 電話 / 経験レベル / 任意ニックネーム / 利用規約同意 ISO8601 タイムスタンプ）
  - 認証コードのハッシュ値（原文は格納 SHALL NOT）
  - 試行回数（INTEGER、初期値 0）
  - 期限タイムスタンプ（発行時刻 + 30 分）
  - created_at / updated_at（既存の `set_updated_at()` トリガを適用 MUST）
- 列定義の具体型と CHECK 制約は migration ファイルで確定する SHALL（jsonb / timestamptz / text 等）
- 本テーブルは短期 KV 用途のため、既存の `members` / `reservations` 等のドメインテーブルとは性質が異なり、ドメインモデル（Branded Types / アプリ層型）を別途用意 SHALL NOT する。アプリ層からの直接アクセスは禁止される（RLS は別 capability `rls-policies` で規定）

#### Scenario: テーブル定義の存在
- **WHEN** `SELECT to_regclass('public.signup_pending')` を実行
- **THEN** NULL 以外（テーブルが存在する）が返る

#### Scenario: email がユニーク
- **WHEN** 同 email で 2 行 INSERT を試みる（service_role 経由）
- **THEN** 2 行目はユニーク制約違反でエラー、または UPSERT で 1 行目を上書きする

#### Scenario: 認証コード原文は保管されない
- **WHEN** `signup_pending` の全列をダンプして 6 桁数字の連続パターンを grep する
- **THEN** マッチしない（コードはハッシュ化されているため）

#### Scenario: 期限超過行は検証 Function で除去
- **WHEN** 期限を過ぎた `signup_pending` 行が存在する状態で `verify-signup` Edge Function が呼ばれる
- **THEN** Function 内で当該行が削除される（pg_cron に依存しない）

### Requirement: members 行は signup フロー完了時に正式値で作成される

本 change 適用後、`members` 行は Edge Function `verify-signup` 内で `auth.users` 作成と同一トランザクションで作成される SHALL。トリガー `on_auth_user_created` で作られる placeholder 行（Phase 1 設計）は、本フローでは即座に正式値で UPSERT 上書きされる MUST。

`members` の必須項目（`display_name` / `birthday` / `phone` / `experience_level` / `profile.signup_completed = true` / `profile.terms_agreed_at`）はすべて `signup_pending` の payload から埋まる SHALL。Phase 1 のように placeholder 値（`display_name = ''` / `birthday = current_date`）が一時的にも残ることは SHALL NOT 許容される。

#### Scenario: 検証成功で members が完成状態で作成される
- **WHEN** `verify-signup` が成功した直後の `members` 行を SELECT する
- **THEN** `display_name` が空文字でない、`birthday` が payload の値、`phone` が国内携帯番号正規化後の値、`profile.signup_completed = true`、`profile.terms_agreed_at` がセット済みの状態である

#### Scenario: placeholder 行が残らない
- **WHEN** 検証フローのいずれかのステップで失敗（コード誤入力等）
- **THEN** `auth.users` も `members` も作成されないため、placeholder 行は DB のどこにも存在しない

### Requirement: AWS Legacy 由来 events への Legacy ID マーカー埋め込み

システムは AWS DynamoDB から Supabase `events` へ移行されたイベント行について、`description` 列に `[Legacy ID: <aws_id>@<aws_start_time>]` の形式で AWS 側 ID と開始日時の複合キーを埋め込み MUST する。これは継続維持される列構造ではなく、一度きりの移行スクリプト (`scripts/migrate-aws-events-to-supabase.ts`) が冪等性判定に用いるマーカーである。

AWS DynamoDB 側で id 単独が一意性を保証していない（同一 id を複数イベントが共有しているケースがある）ため、id + 開始日時の複合キーで識別する SHALL。

#### Scenario: 本文なしの AWS イベント移行

- **WHEN** description が空の AWS イベントを Supabase へ INSERT する
- **THEN** `description = "[Legacy ID: <aws_id>@<aws_start_time>]"` の形式で 1 行だけ書き込まれる

#### Scenario: 同一 AWS id を共有する複数イベントの移行

- **WHEN** 同一 AWS id を持つ複数イベント（開始日時のみ異なる）を移行する
- **THEN** 各イベントは `description = "[Legacy ID: <aws_id>@<start_time_1>]"`、`[Legacy ID: <aws_id>@<start_time_2>]`、... と開始日時で区別された別個の行として INSERT される

#### Scenario: 再実行時の冪等性担保

- **WHEN** 移行スクリプトが同一 AWS id + 同一 start_time のイベントを再度処理しようとする
- **THEN** Supabase events を `description ILIKE '%[Legacy ID: <aws_id>@<aws_start_time>]%'` で検索しヒットすれば SKIP し、重複行を作らない

#### Scenario: admin による Legacy ID マーカー編集の許可

- **WHEN** admin ユーザーが events.description から `[Legacy ID: ...]` 文字列を削除する
- **THEN** スキーマ上の制約違反は起きない（マーカー保持は移行スクリプトの冪等性のためだけに必要で、保持の SHALL 要件はない）。ただし削除後は当該行が「Legacy 由来」と機械判定できなくなる

### Requirement: AWS イベント時刻の JST タイムゾーン補正

AWS DynamoDB の `start_time` / `end_time` はタイムゾーン designator を持たない ISO 8601 文字列（例: `2025-10-11T18:00:00`）であるが、High Q 運用上は JST 表記として扱われている。移行スクリプトは Supabase `timestamptz` への保存時に `+09:00` を補って正しい絶対時刻として保存 MUST する。

#### Scenario: TZ designator なしの AWS 時刻を JST として保存

- **WHEN** AWS の `start_time` が `2025-10-11T18:00:00` の形式（末尾に Z / ±HH:MM がない）
- **THEN** Supabase へは `2025-10-11T18:00:00+09:00` として書き込み、JST 18:00 開始の絶対時刻が正しく記録される

#### Scenario: TZ designator ありの AWS 時刻はそのまま使用

- **WHEN** AWS の `start_time` が `2025-10-11T18:00:00+09:00` または `2025-10-11T09:00:00Z` のように TZ designator を持つ
- **THEN** 補正は行わず、そのまま Supabase に保存する

### Requirement: 空 location イベントの移行スキップ

AWS DynamoDB に存在する `location` が空文字（`""`）または欠落のイベントについて、移行スクリプトは venue 解決が不可能なため SKIP し、警告ログを出力 MUST する。

#### Scenario: 空 location イベントの SKIP

- **WHEN** AWS イベントの `location` フィールドが空文字または未定義
- **THEN** スクリプトはそのイベントを INSERT せず、`[event] SKIP (empty location)` ログを出力し、サマリーの「SKIP（空 location）」件数に計上する

### Requirement: approved 対照表における `skip` アクションのサポート

`correspondence-venues-approved.md` の判定欄に `skip` を指定された AWS location について、移行スクリプトは当該 location を持つ全 AWS イベントを移行対象から除外 MUST する。これは「LP に表示すべきでないイベント（テスト用・運営内部用など）を移行時点で機械的に除外する」運用に用いる。

#### Scenario: skip 指定 location のイベントが除外される

- **WHEN** approved の行に `判定 = skip` の location が記載され、AWS にその location を持つイベントが存在する
- **THEN** 当該イベントは INSERT されず、`[event] SKIP (approved skip)` ログが出力され、サマリーの「SKIP（approved skip）」件数に計上される

### Requirement: 複数 AWS location の同一 venue への統合

`correspondence-venues-approved.md` で複数の AWS location が同じ `new` venue 名を指定された場合、移行スクリプトはそれら location を **同一の venue 行**として 1 度だけ INSERT し、すべての AWS location が同じ `venue_id` を共有 MUST する。これは「同じ会場の表記揺れを 1 つの venue に寄せる」用途や「駅集合のように場所を秘匿しつつ複数表記を統合する」用途で用いる。

#### Scenario: 異なる AWS location が同じ新規 venue に統合される

- **WHEN** approved に複数の `new` 行があり、いずれも同じ「Supabase venue 候補」名（例: `有明会場`）を指す
- **THEN** スクリプトは `venues` テーブルに 1 行だけ INSERT し、それら全ての AWS location のイベントは同一の `venue_id` を持つ events 行として書き込まれる

### Requirement: member_list_view ビュー

システムは MUST `member_list_view` という SQL view を提供する。本 view は admin の `/members` 画面が単一クエリで会員一覧と集計情報を取得するための DTO として機能し、以下の列を返す:

- `id` (uuid) — members.id
- `display_name` (text) — members.display_name
- `email` (text) — members.email
- `experience_level` (text) — members.experience_level（'beginner' / 'intermediate' / 'experienced'）
- `admin_note` (text) — members.admin_note（NULL 可）
- `first_attended_at` (timestamptz) — 当該 member が `status = 'attended'` を持つ events のうち最も古い `events.start_at`。attended 履歴ゼロのときは NULL
- `attended_count` (integer) — 当該 member の `reservations.status = 'attended'` の件数（同伴は含まない、member 単位）
- `last_attended_at` (timestamptz) — 当該 member が `status = 'attended'` を持つ events のうち最も新しい `events.start_at`。attended 履歴ゼロのときは NULL
- `created_at` (timestamptz) — members.created_at（参考列、ソート対象外）

view は members × reservations × events の LEFT JOIN ベースで構成し、`reservations.status = 'attended'` で絞った集計サブクエリを join する形を取る。view は `SECURITY INVOKER` で作成 MUST し、参照テーブルの RLS を継承する。

#### Scenario: 全列が返る
- **WHEN** admin が `SELECT * FROM member_list_view LIMIT 1` を実行
- **THEN** 上記の全列が返る

#### Scenario: attended 履歴ありの会員
- **WHEN** ある member が events 3 件で `status = 'attended'`、1 件で `status = 'reserved'`、1 件で `status = 'cancelled'` を持つ
- **THEN** `attended_count = 3`、`first_attended_at` / `last_attended_at` は 3 件の attended events のうち最古 / 最新の start_at を返す

#### Scenario: attended 履歴ゼロの会員
- **WHEN** ある member が `status = 'reserved'` のみ持つ（attended 履歴ゼロ）
- **THEN** `attended_count = 0`、`first_attended_at IS NULL`、`last_attended_at IS NULL`

#### Scenario: 予約一切なしの会員
- **WHEN** ある member が reservations を 1 件も持たない（登録のみ）
- **THEN** `attended_count = 0`、`first_attended_at IS NULL`、`last_attended_at IS NULL` の行が返る（LEFT JOIN により会員行は欠落しない）

#### Scenario: 同伴は累計に含まれない
- **WHEN** ある member が `status = 'attended'` で `guest_count = 2` の予約を 3 件持つ
- **THEN** `attended_count = 3`（member 数ベース、同伴 2 名は加算されない）

#### Scenario: 非 admin の SELECT
- **WHEN** 非 admin ユーザーが `SELECT * FROM member_list_view` を実行
- **THEN** `members` テーブルの SELECT RLS により自分の行のみ返る（admin_note 列含む。本人の閲覧経路はアプリ層列指定で除外、`rls-policies` capability に従う）

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

### Requirement: Branded Types との対応（member_list_view / member_history_view）

システムは TypeScript 側で `member_list_view` の行型を `MemberListRow`、`member_history_view` の行型を `MemberHistoryRow` という型エイリアスで提供 SHALL する。両型の `id` / `member_id` / `event_id` / `reservation_id` 列は既存 Branded Types（`MemberId` / `EventId` / `ReservationId`）と整合 MUST する。

#### Scenario: MemberListRow の型整合
- **WHEN** `MemberListRow['id']` を参照
- **THEN** `MemberId` 型として型付けされる

#### Scenario: MemberHistoryRow の型整合
- **WHEN** `MemberHistoryRow['member_id']` / `MemberHistoryRow['event_id']` / `MemberHistoryRow['reservation_id']` を参照
- **THEN** それぞれ `MemberId` / `EventId` / `ReservationId` として型付けされる

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

