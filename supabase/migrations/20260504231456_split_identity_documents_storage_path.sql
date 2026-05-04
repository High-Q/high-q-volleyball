-- =============================================================================
-- #92 reservation 本人確認書類アップロード — DB スキーマ列分割
-- =============================================================================
--
-- 目的:
--   identity_documents テーブルの storage_path 単一列を、表裏 2 ファイル対応のため
--   storage_path_front (NOT NULL) + storage_path_back (NULL 可) に分割する。
--
-- 設計判断:
--   - 1 つの書類提出セット (= 1 行) で表 + 裏 (任意) を表現
--   - admin レビュー画面で表裏のペアリングが脆弱な手がかり (created_at 等) に依存しない
--   - RLS は member_id ベースで列名に依存しないため変更不要
--
-- 互換性:
--   本番 DB は 0 行のため、データ移行不要。RENAME + ADD COLUMN のみで完結。
--
-- 関連:
--   openspec/changes/reservation-identity-document-upload/design.md (D17)
--   openspec/changes/reservation-identity-document-upload/specs/data-schema/spec.md
-- =============================================================================

alter table public.identity_documents
  rename column storage_path to storage_path_front;

alter table public.identity_documents
  add column storage_path_back text null;

comment on column public.identity_documents.storage_path_front
  is '表面画像の Supabase Storage パス (member_id/<doc_id>-front.<ext>)';

comment on column public.identity_documents.storage_path_back
  is '裏面画像の Supabase Storage パス (任意提出、member_id/<doc_id>-back.<ext>)';
