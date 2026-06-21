## MODIFIED Requirements

### Requirement: events テーブル

システムは `events` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`name` (text NOT NULL)、`description` (text)、`start_at` (timestamptz NOT NULL)、`end_at` (timestamptz NOT NULL)、`venue_id` (uuid NOT NULL references venues(id) ON DELETE RESTRICT)、`fee` (integer NULL — NULL は会場 default_fee を継承)、`capacity` (smallint NULL)、`email_note` (text NULL — 会員向け予約完了/変更メールに掲載する任意の追記メッセージ。NULL / 空文字はメール非掲載)、`visibility` (text CHECK in `'draft'`,`'published'`,`'private'`、default `'draft'`)、`status` (text CHECK in `'scheduled'`,`'cancelled'`,`'closed'`、default `'scheduled'`)、`cancel_deadline` (timestamptz NULL)、`created_at` (timestamptz default now)、`updated_at` (timestamptz default now)、`created_by` (uuid references auth.users(id) ON DELETE SET NULL)。

既存の `location` 列 (free text) は本 change で DROP MUST する (本番 DB は空のため互換維持不要、venue_id への一本化を強制する)。

`visibility` と `status` を分離 MUST: `visibility` は admin の公開ステータス、`status` は実施ステータス (中止 / 終了等)。

`email_note` は会員向けメールにそのまま掲載される自由文であり、`description` (AWS Legacy ID マーカー埋め込み用途) とは独立した列とする MUST。

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

#### Scenario: email_note 未設定時のデフォルト
- **WHEN** email_note を指定せずに events を INSERT
- **THEN** email_note は NULL で作成され、予約完了/変更メールにイベント追記メッセージのセクションは描画されない
