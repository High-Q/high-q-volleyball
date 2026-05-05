-- Migration: identity_documents.storage_path_front の NOT NULL 制約を解除する
--
-- 経緯: #171 admin 本人確認書類レビュー画面の「マスク漏れ即時削除」アクションで、
--       Storage オブジェクト削除と同期して DB 列を NULL に設定し「削除済みマーカー」として
--       運用するため、本列の NOT NULL 制約を解除する。
--
-- 互換性: 本番 DB は影響を受ける既存値 (NULL) を持たないため、ALTER TABLE で安全に変更可能。
--         アプリ層 (reservation 側 #92 の useUploadIdentityDocument) は INSERT 時に常に
--         非 NULL を渡すため、通常運用で storage_path_front IS NULL となるのは admin
--         マスク漏れ削除後のみ。
--
-- 関連:
--   openspec/changes/admin-identity-document-review/proposal.md
--   openspec/changes/admin-identity-document-review/design.md (D10, D19)
--   openspec/changes/admin-identity-document-review/specs/data-schema/spec.md (MODIFIED)

ALTER TABLE public.identity_documents
  ALTER COLUMN storage_path_front DROP NOT NULL;

COMMENT ON COLUMN public.identity_documents.storage_path_front IS
  'Supabase Storage 内の表面画像キー。INSERT 時はアプリ層で必須、admin マスク漏れ削除時のみ NULL になる。';
