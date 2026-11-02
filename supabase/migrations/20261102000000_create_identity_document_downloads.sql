-- =============================================================================
-- identity_document_downloads: 役所提出用 本人確認書類一括ダウンロードの監査ログ
-- =============================================================================
-- #172 役所提出用 本人確認書類一括ダウンロード（管理画面）
-- 誰が・いつ・どの会員 / どの書類を取り出したかを追記専用で記録する。
-- 画像実体は保持せず、参照した identity_documents.id のみを記録する。
--
-- 出発点: supabase/templates/new_table.sql
-- 参照: CLAUDE.md Pillar 4 / docs/06-品質・セキュリティ/03-アクセス制御・認可設計.md
--       openspec/changes/admin-identity-document-bulk-export/specs/data-schema/spec.md
--       openspec/changes/admin-identity-document-bulk-export/specs/rls-policies/spec.md
-- 検証: 適用後 `supabase db query --linked --file supabase/tests/verify_grants.sql`
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. テーブル作成
-- -----------------------------------------------------------------------------

create table if not exists public.identity_document_downloads (
  id             uuid primary key default gen_random_uuid(),

  -- ダウンロードを実行した admin の member id。会員削除後もログを保持するため
  -- ON DELETE SET NULL（追記専用の監査記録を失わない）。
  downloaded_by  uuid references public.members(id) on delete set null,

  downloaded_at  timestamptz not null default now(),

  -- ZIP に含めた書類の所有会員 id 群 / ZIP に実際に含めた identity_documents.id 群。
  member_ids     uuid[] not null,
  document_ids   uuid[] not null,

  -- 上記配列の件数（集計の明示保持。member_ids / document_ids と整合させて記録）。
  member_count   int not null,
  document_count int not null,

  -- 任意の補足メモ。
  note           text
);

comment on table public.identity_document_downloads is
  '役所提出用 本人確認書類一括ダウンロードの監査ログ（追記専用・admin のみ）。画像実体は持たず document_ids で identity_documents を参照する。#172';


-- -----------------------------------------------------------------------------
-- 2. RLS 有効化
-- -----------------------------------------------------------------------------
-- High Q では RLS なしテーブルを許容しない (CLAUDE.md Pillar 4)。

alter table public.identity_document_downloads enable row level security;


-- -----------------------------------------------------------------------------
-- 3. RLS ポリシー（admin のみ SELECT / INSERT。UPDATE / DELETE は作らない＝不変）
-- -----------------------------------------------------------------------------

-- SELECT: admin のみ（自身が記録したログを含む全ログを閲覧可）。
create policy "identity_document_downloads_select_admin"
  on public.identity_document_downloads
  for select
  using (public.is_admin());

-- INSERT: admin のみ。WITH CHECK で is_admin() を強制。
create policy "identity_document_downloads_insert_admin"
  on public.identity_document_downloads
  for insert
  with check (public.is_admin());

-- UPDATE / DELETE: ポリシーを作らない（追記専用の不変監査ログ）。


-- -----------------------------------------------------------------------------
-- 4. GRANT (3 ロール明示付与)
-- -----------------------------------------------------------------------------
-- Supabase の Data API 仕様変更に備え、明示 GRANT を書き切る。
-- 行レベルの可否は RLS の is_admin() で制御する。

-- 4.1 anon: 監査ログは非公開。GRANT を付与しない。

-- 4.2 authenticated: select / insert のみ（RLS で admin 以外は 0 行・INSERT 拒否）。
grant select, insert on public.identity_document_downloads to authenticated;

-- 4.3 service_role: 全権限（特権・必須）。
grant select, insert, update, delete on public.identity_document_downloads to service_role;


-- =============================================================================
-- ROLLBACK (緊急時のみ手動で実行)
-- =============================================================================
-- ROLLBACK: revoke all on public.identity_document_downloads from service_role;
-- ROLLBACK: revoke all on public.identity_document_downloads from authenticated;
-- ROLLBACK: drop policy if exists "identity_document_downloads_insert_admin" on public.identity_document_downloads;
-- ROLLBACK: drop policy if exists "identity_document_downloads_select_admin" on public.identity_document_downloads;
-- ROLLBACK: drop table if exists public.identity_document_downloads;
