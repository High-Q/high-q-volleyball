## Why

Supabase は 2026-10-30 から既存プロジェクトでも「public schema のテーブルを Data API (PostgREST) に露出させるには明示 GRANT が必要」という挙動に切り替わる。High Q は既存プロジェクトのため、既存テーブルの GRANT は維持されるはずだが、Supabase 側の bootstrap 挙動変更で `alter default privileges` が想定どおり効かないリスクが残る。enforce 後に新規テーブル migration が GRANT を忘れていた場合、admin / reservation / Edge Function から「permission denied」で 500 を返し、本番障害になる。

人間運用に頼った「migration を書くときに GRANT も足してね」では再発防止にならない。テンプレートと検証クエリと CLAUDE.md ルールの 3 点セットで、新規テーブル追加時の GRANT 漏れを構造的に防ぎたい。

## What Changes

- 新規テーブル migration の出発点となるテンプレート SQL を `supabase/templates/` 配下に追加し、CREATE TABLE + RLS enable + policy + 3 ロール (anon / authenticated / service_role) の明示 GRANT を 1 ファイルで提示する
- 全 public テーブルの 3 ロール権限を `has_table_privilege` で一覧化する検証クエリを `supabase/tests/` 配下に追加し、Apply 完了時や enforce 期日前点検でレムが直接実行できるようにする
- `CLAUDE.md` Pillar 4 に「新規テーブル migration に anon / authenticated / service_role への明示 GRANT を必ず含める」ルールを明文化し、テンプレ参照リンクを張る
- `docs/templates/design.md` の「DB / Supabase 設計」セクションに、テーブル新規作成時はテンプレ SQL を出発点として GRANT を必ず含めるチェック項目を追記する

## Capabilities

### Modified Capabilities

- `supabase-foundation`: 新規テーブル migration に対する「明示 GRANT 必須」ルールと、出発点テンプレ・検証クエリの提供を要件として追加する

### New Capabilities

なし。本変更は既存 `supabase-foundation` capability への追記のみで完結する。

## Impact

- 影響コード: `supabase/templates/` 新規 1 ファイル / `supabase/tests/` 新規 1 ファイル / `CLAUDE.md` 1 項目追記 / `docs/templates/design.md` 1 項目追記
- ランタイム影響なし。既存テーブルや本番動作には一切触れない (テンプレと検証クエリは Apply 時に走らせる対象ではなく、新規テーブル追加時の参考資料)
- 既存 GRANT 構成 (`20260429000000_table_grants.sql` / `20260511000100_grant_service_role.sql`) は維持され、再付与しない
- 後続として「CI で migration の GRANT 有無を機械検知する」案があるが、本変更ではスコープ外 (別 Issue として切り出し可)

## 制約・前提条件

- enforce 期日: 2026-10-30 (Supabase 既存プロジェクト)。目標完了は 2026-09-30
- 既存テーブルの GRANT 状態の最終確認は Supabase Dashboard の Security Advisor 経由で翔太郎くん本人が行う (Apply フェーズでは検証クエリの提供までを完了とする)

## 成功基準

- [ ] 新規テーブル migration のテンプレートが置かれ、想定する 3 ロール GRANT が 1 箇所で確認できる
- [ ] 検証クエリが置かれ、レムが `supabase db query --linked --file <path>` で 3 ロール権限を一覧確認できる
- [ ] CLAUDE.md Pillar 4 にルールが明文化され、テンプレ・検証クエリへの導線が張られている
- [ ] 2026-09-30 までに Supabase Dashboard Security Advisor で既存テーブル状態を確認し、Issue #247 をクローズできる
