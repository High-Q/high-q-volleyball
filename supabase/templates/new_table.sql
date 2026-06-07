-- =============================================================================
-- 新規テーブル migration テンプレート
-- =============================================================================
-- 使い方:
--   1. 本ファイルを `supabase/migrations/<YYYYMMDDHHMMSS>_<説明>.sql` にコピー
--      (本ファイル自体は `supabase/templates/` に残し、migrations へ移動しない)
--   2. `<TABLE_NAME>` を実テーブル名に置換
--   3. `<COLUMN_*>` プレースホルダを実カラムに置換
--   4. RLS policy の `USING` / `WITH CHECK` を業務要件に合わせて埋める
--   5. anon ロール GRANT は「公開テーブル」のみ残す。会員のみ閲覧なら削除する
--   6. service_role GRANT は Edge Function / Admin API 用に必須
--   7. 末尾 `-- ROLLBACK:` コメントを実テーブル名で書き直す
--
-- 背景: 2026-10-30 から Supabase 既存プロジェクトでも Data API (PostgREST) に
--       public schema テーブルを露出させるには明示 GRANT が必要になる
--       (Issue #247)。`alter default privileges` の自動付与に頼らず、
--       新規テーブル migration では 3 ロール GRANT を必ず書き切る方針。
--
-- 参照: CLAUDE.md Pillar 4 / docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md
-- 検証: 適用後 `supabase db query --linked --file supabase/tests/verify_grants.sql`
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. テーブル作成
-- -----------------------------------------------------------------------------

create table if not exists public.<TABLE_NAME> (
  id          uuid primary key default gen_random_uuid(),

  -- TODO: 業務カラムをここに追加
  -- <COLUMN_FOO> text not null,
  -- <COLUMN_BAR> uuid not null references public.<OTHER_TABLE>(id) on delete cascade,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.<TABLE_NAME> is '<TODO: テーブルの目的を1行で説明>';


-- -----------------------------------------------------------------------------
-- 2. RLS 有効化
-- -----------------------------------------------------------------------------
-- High Q では RLS なしテーブルを許容しない (CLAUDE.md Pillar 4)。

alter table public.<TABLE_NAME> enable row level security;


-- -----------------------------------------------------------------------------
-- 3. RLS ポリシー
-- -----------------------------------------------------------------------------
-- 4 操作それぞれにポリシーを定義する。不要な操作 (例: anon の INSERT) は
-- policy を作らずに GRANT も外すこと。
-- 参考実装: supabase/migrations/20260428143738_db_schema_foundation.sql

-- SELECT: 例) 誰でも閲覧可 (公開テーブルの場合)
-- create policy "<TABLE_NAME>_select_public" on public.<TABLE_NAME>
--   for select
--   using (true);

-- SELECT: 例) 自分の行のみ閲覧可 (members 紐付けテーブルの場合)
-- create policy "<TABLE_NAME>_select_own" on public.<TABLE_NAME>
--   for select
--   using (auth.uid() = member_id);

-- INSERT: 例) authenticated のみ自分の行を作成可
-- create policy "<TABLE_NAME>_insert_own" on public.<TABLE_NAME>
--   for insert
--   with check (auth.uid() = member_id);

-- UPDATE: 例) 自分の行のみ更新可
-- create policy "<TABLE_NAME>_update_own" on public.<TABLE_NAME>
--   for update
--   using (auth.uid() = member_id)
--   with check (auth.uid() = member_id);

-- DELETE: 例) admin のみ削除可 (members.role = 'admin' を参照)
-- create policy "<TABLE_NAME>_delete_admin" on public.<TABLE_NAME>
--   for delete
--   using (
--     exists (
--       select 1 from public.members m
--       where m.id = auth.uid() and m.role = 'admin'
--     )
--   );


-- -----------------------------------------------------------------------------
-- 4. GRANT (3 ロール明示付与)
-- -----------------------------------------------------------------------------
-- Supabase の Data API 仕様変更 (2026-10-30 enforce) に備え、
-- `alter default privileges` の自動付与には頼らず明示 GRANT を必ず書く。
-- RLS で行レベルフィルタはかかるが、GRANT が無いとテーブル自体に到達できない。

-- 4.1 anon (未認証) — 公開テーブルのみ。会員専用テーブルなら削除すること。
grant select on public.<TABLE_NAME> to anon;

-- 4.2 authenticated (ログイン会員) — 通常 CRUD。RLS で行レベル制御。
grant select, insert, update, delete on public.<TABLE_NAME> to authenticated;

-- 4.3 service_role (Edge Function / Admin API 用、特権・必須)
grant select, insert, update, delete on public.<TABLE_NAME> to service_role;


-- =============================================================================
-- ROLLBACK (緊急時のみ手動で実行)
-- =============================================================================
-- ROLLBACK: revoke all on public.<TABLE_NAME> from service_role;
-- ROLLBACK: revoke all on public.<TABLE_NAME> from authenticated;
-- ROLLBACK: revoke all on public.<TABLE_NAME> from anon;
-- ROLLBACK: drop policy if exists "<TABLE_NAME>_select_public"  on public.<TABLE_NAME>;
-- ROLLBACK: drop policy if exists "<TABLE_NAME>_insert_own"     on public.<TABLE_NAME>;
-- ROLLBACK: drop policy if exists "<TABLE_NAME>_update_own"     on public.<TABLE_NAME>;
-- ROLLBACK: drop policy if exists "<TABLE_NAME>_delete_admin"   on public.<TABLE_NAME>;
-- ROLLBACK: drop table if exists public.<TABLE_NAME>;
