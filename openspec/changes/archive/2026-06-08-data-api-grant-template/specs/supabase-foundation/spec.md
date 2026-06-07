## ADDED Requirements

### Requirement: 新規テーブル migration は 3 ロールへの明示 GRANT を含める

`supabase/migrations/` に新規追加されるテーブル作成 migration は `supabase/templates/new_table.sql` を出発点とし、anon / authenticated / service_role の 3 ロールに対し当該テーブルの利用想定に沿った `grant` 文を明示的に含めなければならない (SHALL)。`alter default privileges` による自動付与にのみ依存してはならない (SHALL NOT) 。これは Supabase の Data API 仕様変更 (2026-10-30 既存プロジェクト enforce) において、public schema テーブルが PostgREST 経由でアクセスされるために明示 GRANT が必要となるためである。

#### Scenario: 新規テーブル migration がテンプレを出発点として書かれる

- **WHEN** 開発者が `supabase/migrations/<timestamp>_add_<name>.sql` を新規作成する
- **THEN** 当該 migration は `supabase/templates/new_table.sql` の構成 (CREATE TABLE / enable RLS / create policy / 3 ロール GRANT / ROLLBACK コメント) を踏襲しており、anon / authenticated / service_role それぞれに対する `grant` 文を含む

#### Scenario: 明示 GRANT 抜けの新規 migration は許容しない

- **WHEN** 新規テーブル migration が `create table` を含むが、anon / authenticated / service_role のいずれか 1 つでも明示 `grant` 文を欠く
- **THEN** 当該 migration は本要件を満たさず、レビューで差し戻しの対象となる (CI による機械検知は本変更ではスコープ外、レビュー時の人手チェックで担保)

### Requirement: GRANT 状態の検証クエリを提供する

システムは `supabase/tests/verify_grants.sql` を提供 SHALL し、public schema の全ベーステーブルに対する anon / authenticated / service_role の SELECT / INSERT / UPDATE / DELETE 権限を `has_table_privilege` で一覧化できるようにする。本クエリは `supabase db query --linked --file supabase/tests/verify_grants.sql` で dev / prd 双方に対し実行可能であり、enforce 期日前点検と新規テーブル追加後の自己検証に用いる SHALL 。

#### Scenario: 検証クエリの実行で全テーブル × 3 ロール × 4 権限を取得

- **WHEN** 開発者またはレムが `supabase db query --linked --file supabase/tests/verify_grants.sql` を実行する
- **THEN** public schema の全ベーステーブルについて、anon / authenticated / service_role の 4 権限 (SELECT / INSERT / UPDATE / DELETE) の付与状態が table_name 昇順 + role 固定順で出力され、欠落を目視で発見できる

#### Scenario: ロール権限欠落の検出

- **WHEN** いずれかのテーブルで service_role の SELECT が `false` を返す
- **THEN** 出力からそのテーブルが特定でき、補正 migration の作成判断ができる
