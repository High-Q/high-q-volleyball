# migration-safety-checks Specification

## Purpose
TBD - created by archiving change mechanize-rule-violation-detection. Update Purpose after archive.
## Requirements
### Requirement: 新規 migration に対し RLS ポリシーの存在を CI で検証する

`supabase/migrations/` 配下に新規追加された `*.sql` ファイルが `create table` 文を含む場合、同 migration ファイル内に `alter table ... enable row level security` および `create policy` が含まれていなければならない（SHALL）。違反時 CI step は fail し、PR を merge できなくしなければならない（SHALL）。既存 migration（本 change のマージ時点で既にリポジトリに存在するもの）は allowlist で除外する（SHALL）。allowlist は `scripts/static-checks/migrations-allowlist.txt` に管理する。

#### Scenario: RLS なしの新規 migration で CI fail
- **WHEN** PR で `supabase/migrations/20990101000000_add_foo.sql` が追加され、内容に `create table foo (...)` のみ含まれる
- **THEN** RLS チェック step が fail し、CI 全体が fail する

#### Scenario: RLS + policy ありの新規 migration は pass
- **WHEN** 同 migration に `alter table foo enable row level security;` と `create policy ... on foo for select using (...);` が含まれる
- **THEN** RLS チェック step が pass する

#### Scenario: allowlist に列挙された既存 migration はスキップ
- **WHEN** `migrations-allowlist.txt` に記載されたファイルが `create table` を含む
- **THEN** 当該ファイルは検査対象外として skip される

### Requirement: マイナンバー 12 桁 text 列の禁止を CI で検証する

`supabase/migrations/` 配下の `*.sql` ファイルにおいて、`create table` または `alter table ... add column` で `text` / `varchar` / `char` 型の列が次の名前パターンのいずれかに該当した場合、CI step は fail しなければならない（SHALL）:

- `my_number` / `mynumber` / `personal_number` / `national_id`
- `個人番号` / `マイナンバー`

本ルールは text として個人番号を保管する SOP 違反を捕まえることが目的（SHALL）。画像 Storage 等のメタデータ列（例: `identity_documents.image_path`）は本ルールの対象外（SHALL NOT）。

#### Scenario: my_number text 列の追加で CI fail
- **WHEN** 新規 migration に `alter table members add column my_number text;` が含まれる
- **THEN** マイナンバー SOP チェック step が fail する

#### Scenario: 画像メタデータ列は許容
- **WHEN** 新規 migration に `alter table identity_documents add column image_path text;` が含まれる
- **THEN** チェック step が pass する

### Requirement: 新規 migration にロールバック手順コメントの存在を CI で warning する

`supabase/migrations/` 配下に新規追加された `*.sql` ファイルには、ロールバック手順を示すコメントブロック（例: `-- ROLLBACK:` または `-- rollback:` で始まる行）が含まれていることが望ましい（SHOULD）。存在しない場合 CI step は warning を報告しなければならない（SHALL）。warning は CI fail にはしない（SHALL NOT fail）。

#### Scenario: ロールバックコメントなしで warning
- **WHEN** 新規 migration ファイルに `-- ROLLBACK:` で始まる行が存在しない
- **THEN** CI step に warning メッセージが出力される（job は pass）

#### Scenario: ロールバックコメントありで warning なし
- **WHEN** 新規 migration ファイルに `-- ROLLBACK: drop table foo;` 等のコメント行がある
- **THEN** warning は出ない

### Requirement: 静的検査 script を `scripts/static-checks/` 配下に集約する

migration 安全性検査の bash script は `scripts/static-checks/migrations/` 配下に置かれなければならない（SHALL）。各 script はリポジトリルートから直接実行可能（`./scripts/static-checks/migrations/check-rls.sh` 等）であり、CI と loca の両方で同じコマンドで起動できなければならない（SHALL）。終了コード 0 で pass、非 0 で fail を表す（SHALL）。

#### Scenario: ローカルで RLS チェックが実行可能
- **WHEN** リポジトリルートで `./scripts/static-checks/migrations/check-rls.sh` を実行する
- **THEN** 終了コードが 0 または非 0 で結果が得られる（実行自体は成功する）

### Requirement: 既存 migration を allowlist で除外する仕組みを持つ

本 change マージ時点で既に存在する `supabase/migrations/*.sql` ファイル名を `scripts/static-checks/migrations-allowlist.txt` に列挙しなければならない（SHALL）。allowlist 形式は 1 行 1 ファイル名（パス含まず）。allowlist への追加は PR コメントで理由を明示しなければならない（SHALL、運用ルールとして CLAUDE.md に明記）。

#### Scenario: allowlist にあるファイルは検査対象外
- **WHEN** allowlist に列挙された既存 migration が RLS なしで存在する
- **THEN** RLS チェックは当該ファイルを skip し、CI は fail しない

