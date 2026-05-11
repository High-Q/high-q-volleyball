## ADDED Requirements

### Requirement: AWS Legacy 由来 events への Legacy ID マーカー埋め込み

システムは AWS DynamoDB から Supabase `events` へ移行されたイベント行について、`description` 列に `[Legacy ID: <aws_id>]` の形式で AWS 側 ID を埋め込み MUST する。これは継続維持される列構造ではなく、一度きりの移行スクリプト (`scripts/migrate-aws-events-to-supabase.ts`) が冪等性判定に用いるマーカーである。

#### Scenario: 本文なしの AWS イベント移行

- **WHEN** description が空の AWS イベントを Supabase へ INSERT する
- **THEN** `description = "[Legacy ID: <aws_id>]"` の形式で 1 行だけ書き込まれる

#### Scenario: 本文ありの AWS イベント移行

- **WHEN** description に本文を持つ AWS イベントを Supabase へ INSERT する
- **THEN** `description = "<本文>\n\n[Legacy ID: <aws_id>]"` の形式で本文末尾に追記される

#### Scenario: 再実行時の冪等性担保

- **WHEN** 移行スクリプトが同一 AWS ID のイベントを再度処理しようとする
- **THEN** Supabase events を `description ILIKE '%[Legacy ID: <aws_id>]%'` で検索しヒットすれば SKIP し、重複行を作らない

#### Scenario: admin による Legacy ID マーカー編集の許可

- **WHEN** admin ユーザーが events.description から `[Legacy ID: ...]` 文字列を削除する
- **THEN** スキーマ上の制約違反は起きない（マーカー保持は移行スクリプトの冪等性のためだけに必要で、保持の SHALL 要件はない）。ただし削除後は当該行が「Legacy 由来」と機械判定できなくなる
