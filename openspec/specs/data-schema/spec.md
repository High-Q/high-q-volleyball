# Data Schema Spec

## ADDED Requirements

### Requirement: events テーブル

システムは `events` テーブルを以下の列で定義する: `id` (UUID PK)、`name` (text NOT NULL)、`description` (text)、`start_at` (timestamptz NOT NULL)、`end_at` (timestamptz NOT NULL)、`location` (text)、`capacity` (smallint NULL)、`status` (text CHECK in `'scheduled'`,`'cancelled'`,`'closed'`、default `'scheduled'`)、`created_at` (timestamptz default now)、`updated_at` (timestamptz default now)、`created_by` (uuid references auth.users(id))。

#### Scenario: 基本的な作成と取得
- **WHEN** 管理者が name / start_at / end_at を指定して events に行を INSERT
- **THEN** 行が作成され `id` は UUID v4、`created_at` / `updated_at` は now()、`status` は `'scheduled'` がデフォルトで入る

#### Scenario: 開始 < 終了の制約
- **WHEN** start_at >= end_at の行を INSERT しようとする
- **THEN** CHECK 制約 `start_before_end` 違反でエラーとなる

#### Scenario: capacity の範囲
- **WHEN** capacity が負数または 0 の行を INSERT しようとする
- **THEN** CHECK 制約 `capacity_positive` 違反でエラーとなる（capacity は NULL 許可、NULL は無制限）

### Requirement: members テーブル

システムは `members` テーブルを以下の列で定義する: `id` (UUID PK、auth.users.id と同一値で 1:1 紐付け)、`email` (text UNIQUE NOT NULL、auth.users.email から同期)、`display_name` (text NOT NULL)、`role` (text CHECK in `'member'`,`'admin'`、default `'member'`)、`profile` (jsonb default `{}`)、`created_at` / `updated_at` (timestamptz default now)。

#### Scenario: auth.users との 1:1 紐付け
- **WHEN** Supabase Auth で新規ユーザーがサインアップする
- **THEN** トリガー `on_auth_user_created` により `members` に同じ id で行が自動作成され、role は `'member'` が初期値

#### Scenario: role の管理
- **WHEN** 管理者ユーザーが `role = 'admin'` の行を直接更新で作成
- **THEN** その members は admin として扱われる（自己昇格は RLS で禁止、別 change で管理者作成フローを定義）

### Requirement: reservations テーブル

システムは `reservations` テーブルを以下の列で定義する: `id` (UUID PK)、`event_id` (uuid NOT NULL references events(id) ON DELETE RESTRICT)、`member_id` (uuid NOT NULL references members(id) ON DELETE RESTRICT)、`status` (text CHECK in `'reserved'`,`'cancelled'`,`'attended'`,`'no_show'`、default `'reserved'`)、`note` (text)、`created_at` / `updated_at` (timestamptz default now)。

#### Scenario: 1 イベント・1 会員に対して 1 予約
- **WHEN** 同じ (event_id, member_id) で 2 件目の reservations を INSERT
- **THEN** UNIQUE 制約違反でエラーとなる（キャンセル後の再予約は status の更新で対応）

#### Scenario: events と members の参照整合性
- **WHEN** reservations が指す events または members を DELETE
- **THEN** ON DELETE RESTRICT により削除がエラーになる（履歴保護）

### Requirement: updated_at の自動更新

システムは events / members / reservations の `updated_at` 列を行更新時に自動で `now()` に書き換えるトリガー `set_updated_at()` を持つ。

#### Scenario: UPDATE 時の自動更新
- **WHEN** 任意の行を UPDATE する
- **THEN** `updated_at` が現在時刻に更新される（明示的に指定した値があっても上書き）

### Requirement: インデックス

システムは検索性能のため以下のインデックスを作成する:
- `events`: `start_at` の B-tree（カレンダー表示の月絞り込み）、`status` の partial index where `status = 'scheduled'`
- `reservations`: `event_id`、`member_id`、`(member_id, status)` の B-tree
- `members`: `email` の UNIQUE（PK 由来で自動）

#### Scenario: カレンダーのレンジクエリ
- **WHEN** `WHERE start_at >= '2026-04-01' AND start_at < '2026-05-01'` で events を検索
- **THEN** index on `start_at` を使ったプランで返る（EXPLAIN 確認）

### Requirement: Branded Types との対応

システムは TypeScript 側で各テーブルの id 列を以下の Branded Types として表現する: `EventId` / `MemberId` / `ReservationId`。各テーブルの行型は `Event` / `Member` / `Reservation` という型エイリアスで提供する。

#### Scenario: 型エイリアスから列名取得
- **WHEN** `Event['start_at']` を参照
- **THEN** `string`（ISO 8601 文字列）として型付けされる（Date オブジェクトへの変換は呼び出し側責任）

### Requirement: マイナンバーカード収集禁止

システムは個人識別番号（マイナンバー）を保管する列を作成してはならない。本人確認が必要な場合は別途運転免許証等のスキャン画像を扱うが、それは Phase 1.5 以降の別 capability とする。

#### Scenario: スキーマレビュー
- **WHEN** 任意のテーブルに `my_number` / `mynumber` / `individual_number` 等の列が含まれる
- **THEN** Design レビューで却下される
