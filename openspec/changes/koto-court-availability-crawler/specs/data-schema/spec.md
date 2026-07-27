## ADDED Requirements

### Requirement: court_availability_notifications テーブル
システムは通知済みの空き枠を記録する `court_availability_notifications` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`facility` (text NOT NULL — 施設アダプタ識別子。例: `koto-sports`)、`venue_name` (text NOT NULL — 会場・体育室名)、`slot_date` (date NOT NULL — 枠の日付)、`start_at` (timestamptz NOT NULL)、`end_at` (timestamptz NOT NULL)、`reserve_url` (text NOT NULL — 予約 URL)、`notified_at` (timestamptz NOT NULL default now)、`created_at` (timestamptz NOT NULL default now)。

同一空き枠の一意性を担保するため、枠署名（`facility` + `venue_name` + `slot_date` + `start_at` + `end_at`）に UNIQUE 制約を付与 MUST する。

本テーブルは RLS を有効化 MUST し、`anon` / `authenticated` からの読み書きは許可 MUST NOT（オーナー個人への通知状態であり会員に露出しない）。Edge Function / crawl ジョブは `service_role` で読み書き MUST する。`anon` / `authenticated` / `service_role` の 3 ロールへ明示的に GRANT を定義 MUST する（`service_role` にのみ CRUD を付与し、`anon` / `authenticated` には付与しない）。

#### Scenario: 通知済み枠の記録
- **WHEN** crawl が未通知の空き枠を検知して通知した
- **THEN** 枠署名を含む行が `court_availability_notifications` に挿入され、`notified_at` に通知時刻が入る

#### Scenario: 枠署名の重複挿入を拒否
- **WHEN** 既に記録済みの枠署名（facility + venue_name + slot_date + start_at + end_at）を再挿入しようとする
- **THEN** UNIQUE 制約違反となり重複記録されない

#### Scenario: 埋まった枠の記録解除
- **WHEN** 記録済みの枠がその後の crawl で空きでなくなった（埋まった）ことを検知した
- **THEN** 当該枠の行が削除され、将来の再オープン時に再通知できる状態になる

#### Scenario: 会員ロールからの露出禁止
- **WHEN** `anon` または `authenticated` ロールが `court_availability_notifications` を SELECT しようとする
- **THEN** GRANT / RLS により参照できない（オーナー個人向けの通知状態は会員に露出しない）
