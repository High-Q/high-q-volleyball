## 1. 新規テーブルテンプレ SQL

- [x] 1.1 `supabase/templates/` ディレクトリを新設
- [x] 1.2 `supabase/templates/new_table.sql` を作成。ヘッダコメントに「コピー後に `<TABLE_NAME>` / `<COLUMN>` プレースホルダを置換すること、本ファイル自体は migrations へ移動しないこと」を明示
- [x] 1.3 CREATE TABLE 雛形: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` / `created_at timestamptz NOT NULL DEFAULT now()` / `updated_at timestamptz NOT NULL DEFAULT now()` を含める
- [x] 1.4 `alter table <TABLE_NAME> enable row level security;` を含める
- [x] 1.5 RLS policy 雛形を SELECT / INSERT / UPDATE / DELETE の 4 種類で記述 (中身はコメントでガイド、実装者が埋める)
- [x] 1.6 anon ロール GRANT 雛形 (SELECT のみ、不要なら削除する旨をコメント)
- [x] 1.7 authenticated ロール GRANT 雛形 (SELECT / INSERT / UPDATE / DELETE)
- [x] 1.8 service_role ロール GRANT 雛形 (SELECT / INSERT / UPDATE / DELETE)
- [x] 1.9 末尾に `-- ROLLBACK:` コメントブロックを含める

## 2. GRANT 検証クエリ

- [x] 2.1 `supabase/tests/verify_grants.sql` を作成
- [x] 2.2 public schema の全ベーステーブルを `pg_tables` から抽出
- [x] 2.3 各テーブルに対し anon / authenticated / service_role の SELECT / INSERT / UPDATE / DELETE を `has_table_privilege` で取得
- [x] 2.4 出力は (table_name, role, privilege, granted) を昇順整列。目視で欠落が見つかる形にする
- [x] 2.5 ファイルヘッダコメントに「`supabase db query --linked --file supabase/tests/verify_grants.sql` で実行」と運用手順を明示
- [x] 2.6 dev DB に対し試験実行し、現状全テーブルの権限が取得できることを検証 (2026-06-08 実行確認、全 6 テーブル × 3 ロール × 4 権限が想定どおり、service_role は全 true で enforce 後も安全)

## 3. CLAUDE.md Pillar 4 追記

- [x] 3.1 `CLAUDE.md` の Pillar 4 セクションに「新規テーブル migration は `supabase/templates/new_table.sql` を出発点とし、anon / authenticated / service_role への明示 GRANT を含める」ルールを追記
- [x] 3.2 同セクションに検証クエリ `supabase/tests/verify_grants.sql` への 1 行参照を追加
- [x] 3.3 enforce 期日 (2026-10-30) と背景を 1 行で言及

## 4. Design テンプレ追記

- [x] 4.1 `docs/templates/design.md` の「4. DB / Supabase 設計 (テーブル追加・変更がある場合)」配下のチェックリストに次を追加:
  - [x] `supabase/templates/new_table.sql` を出発点として書いた
  - [x] anon / authenticated / service_role への明示 GRANT を含めた
  - [x] 必要に応じて `supabase/tests/verify_grants.sql` で適用後の権限を検証する計画がある

## 5. 最終確認

- [x] 5.1 `openspec validate data-api-grant-template --strict` がパスすることを確認
- [x] 5.2 `git status` clean を確認 (本変更で追加されるファイル: テンプレ 1 / 検証クエリ 1 / CLAUDE.md 追記 / design.md 追記 + openspec change 4 ファイル)
- [x] 5.3 コミット粒度: 1 PR = 1 コミット (ドキュメント中心のため粒度を細かく切る必要なし)
- [x] 5.4 Apply 完了報告に「翔太郎くんが 2026-09-30 までに Supabase Dashboard Security Advisor で既存テーブル状態を確認 → Issue #247 クローズ」というフォロー項目を含める
