## ADDED Requirements

### Requirement: 新規 migration の rollback 戦略の明示

システムは **本 spec 導入後に新規追加される** `supabase/migrations/<timestamp>_<name>.sql` について、当該 migration を以下 3 分類のいずれかに位置付けなければならない (MUST)。既存 migration（本 spec 導入時点でリポジトリに存在する 21 件）は SOP § 5 分類表で「全件カテゴリ 3」として一括宣言する運用とし、ファイル本体への遡及的なコメント追記は要求しない (SHALL NOT)。

- **カテゴリ 1 (forward-only / 加算的)**: CREATE TABLE / CREATE VIEW / ADD COLUMN（NOT NULL 制約なし、または DEFAULT 付き）/ INSERT seed 等の加算的変更。rollback SQL の併設は任意。
- **カテゴリ 2 (要 rollback SQL)**: column rename / FK 変更 / column 削除 / NOT NULL 化 / 既存データ書き換え等、データ構造に影響する変更。対応する `<元タイムスタンプ>_<元名称>_rollback.sql` を同一 PR で `supabase/migrations/` に併設しなければならない (MUST)。
- **カテゴリ 3 (rollback 不可)**: DROP TABLE / TRUNCATE / 不可逆な data migration。migration ファイル冒頭コメントに「rollback 不可: GitHub Actions 自動 pg_dump (#299) または手動 pg_dump からの restore で復旧」と明示しなければならない (MUST)。

分類判定の基準と既存 migrations の分類表は `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` を真実の源とする。

#### Scenario: forward-only 新規 migration を追加

- **WHEN** 開発者が CREATE VIEW のみを含む新規 migration `<timestamp>_add_xxx_view.sql` を `supabase/migrations/` に追加する
- **THEN** rollback SQL の併設は要求されない（カテゴリ 1）が、SOP 分類表への追記により分類が明示される

#### Scenario: 要 rollback の新規 migration を追加

- **WHEN** 開発者が column 削除を含む新規 migration `<timestamp>_drop_xxx_column.sql` を `supabase/migrations/` に追加する
- **THEN** 同一 PR に `<timestamp>_drop_xxx_column_rollback.sql` が含まれており、当該 SQL を適用すると削除した column が元の型・default 値で復元される

#### Scenario: rollback 不可の新規 migration を追加

- **WHEN** 開発者が DROP TABLE を含む新規 migration を `supabase/migrations/` に追加する
- **THEN** migration ファイル冒頭コメントに「rollback 不可: Supabase Daily Backup point-in-time restore で復旧」相当の文言が記載されている

### Requirement: 既存 migrations の分類が SOP に一括宣言される

`docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` § 5 は、本 spec 導入時点でリポジトリに存在する全 `supabase/migrations/*.sql` ファイルを「全件カテゴリ 3 (rollback 不可・Daily Backup point-in-time restore で復旧)」として一括宣言しなければならない (MUST)。新規 migration が追加された場合は SOP § 5 の分類表に追記し、未掲載の migration があってはならない (MUST NOT)。

#### Scenario: 既存 migration が全件カテゴリ 3 として一括宣言されている

- **WHEN** SOP § 5 を読み込む
- **THEN** 「本 spec 導入時点の既存 21 件は全件カテゴリ 3」と明記され、GitHub Actions 自動 pg_dump (#299) または手動 pg_dump からの restore で復旧する旨が記載されている

#### Scenario: 新規 migration が分類表に追記される

- **WHEN** 新規 `supabase/migrations/<timestamp>_<name>.sql` が PR に含まれる
- **THEN** 同 PR で SOP § 5 分類表に当該ファイル名と分類カテゴリが追記されている

### Requirement: バックアップ・復旧 SOP ドキュメントの存在

リポジトリには `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` が存在しなければならない (MUST)。当該 SOP は最低限以下を含まなければならない (MUST): Supabase 自動バックアップ仕様 / Pro プラン昇格 trigger 条件 / 重要 migration 適用前の手動 `pg_dump` 取得手順 / migration 分類ルールと既存 migrations 分類表 / 復旧手順 / 障害時の復旧フロー / 漏洩時対応 SOP との連携 / 法令準拠の根拠。

#### Scenario: SOP ドキュメントが存在し主要章を持つ

- **WHEN** `docs/06-品質・セキュリティ/14-バックアップ復旧SOP.md` を読み込む
- **THEN** Supabase 自動バックアップ仕様 / Pro 昇格 trigger / 手動 pg_dump 手順 / migration 分類 / 既存 migrations 分類表 / 復旧手順 / 障害時復旧フロー / 漏洩時 SOP との連携 / 法令準拠の根拠 の各セクションが存在する
