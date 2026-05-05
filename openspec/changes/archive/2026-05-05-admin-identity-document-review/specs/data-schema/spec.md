## MODIFIED Requirements

### Requirement: identity_documents テーブル

システムは `identity_documents` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`member_id` (uuid NOT NULL references members(id) ON DELETE CASCADE)、`document_type` (text CHECK in 10 種類)、`storage_path_front` (text NULL — Supabase Storage 内の表面画像キー、INSERT 時はアプリ層で必須、admin マスク漏れ削除時のみ NULL になる)、`storage_path_back` (text NULL — Supabase Storage 内の裏面画像キー、任意提出時のみ値を持つ)、`status` (text CHECK in `'pending'`,`'approved'`,`'rejected'`、default `'pending'`)、`rejection_reason` (text NULL)、`uploaded_at` (timestamptz default now)、`reviewed_at` (timestamptz NULL — null = 未確認)、`reviewed_by` (uuid NULL references members(id) ON DELETE SET NULL)。

`document_type` の許容値は次の 10 種類: `'drivers_license'` / `'driving_history_cert'` / `'residence_certificate'` / `'disability_certificate'` / `'residence_card'` / `'special_permanent_resident_cert'` / `'student_id'` / `'passport'` / `'my_number_card_masked'` / `'health_insurance_cert'`。

旧 `storage_path` 列 (text NOT NULL) は #92 の change で `storage_path_front` に RENAME 済 (本番 DB は当時 0 行のため互換維持不要)。`storage_path_back` は #92 で新規追加された列で、表裏 2 ファイル提出時の裏面パスを保持する SHALL。

`storage_path_front` の NOT NULL 制約は本 change (#171 admin レビュー) で **解除** MUST する。理由: admin の「マスク漏れ即時削除」操作で Storage オブジェクト削除と同期して DB 列を NULL に設定し、「削除済みマーカー」として運用するため。アプリ層 (reservation 側 #92 の `useUploadIdentityDocument`) は INSERT 時に常に非 NULL を渡すため、通常運用で `storage_path_front IS NULL` となるのは admin マスク漏れ削除後のみ。

#### Scenario: 表面のみの提出
- **WHEN** `INSERT INTO identity_documents (member_id, document_type, storage_path_front, status) VALUES (?, 'drivers_license', '<uid>/<doc-id>-front.jpg', 'pending')`
- **THEN** 行が作成され、`storage_path_back` は NULL のまま (任意提出のため)

#### Scenario: 表裏両面の提出
- **WHEN** `INSERT INTO identity_documents (member_id, document_type, storage_path_front, storage_path_back, status) VALUES (?, 'drivers_license', '<uid>/<doc-id>-front.jpg', '<uid>/<doc-id>-back.jpg', 'pending')`
- **THEN** 行が作成され、表裏両方のパスが 1 行で保持される

#### Scenario: 表面パス省略は INSERT 時には禁止 (アプリ層責務)
- **WHEN** `storage_path_front` を NULL のまま INSERT する
- **THEN** DB 制約上は許容される (NULL 可) が、アプリ層 (reservation / admin) は INSERT 時に必ず非 NULL を渡す責務を持つ。NULL になり得るのは admin マスク漏れ削除後の UPDATE のみ

#### Scenario: マスク漏れ削除済の状態
- **WHEN** admin がマイナンバー画像のマスク漏れを発見し、Storage オブジェクト削除と同時に `UPDATE identity_documents SET storage_path_front = NULL, storage_path_back = NULL, status = 'rejected', rejection_reason = '個人番号がマスクされていないため削除しました。再提出をお願いします' WHERE id = :id` を発行
- **THEN** 行は更新され、`storage_path_front IS NULL` で「Storage オブジェクト削除済」を表現する。一覧 / 詳細画面では「画像は削除済みです」表示として扱われる

#### Scenario: 画像本体は別管理
- **WHEN** identity_documents 行を作成
- **THEN** 列に画像 BLOB は持たず、`storage_path_front` / `storage_path_back` から Supabase Storage `identity-documents` バケット内のオブジェクトを参照する

#### Scenario: マスク済みマイナンバーカードは受付可
- **WHEN** `document_type = 'my_number_card_masked'` で行を作成
- **THEN** 行は正常に作成される (個人番号 12 桁マスク済み画像であることはアプリ側 UX とレビュー運用で担保)

#### Scenario: マイナンバーカード通知カードは受付不可
- **WHEN** document_type に `'my_number_notification_card'` を指定して INSERT
- **THEN** CHECK 制約違反でエラーとなる

#### Scenario: 削除時の連鎖
- **WHEN** members の行を DELETE
- **THEN** その member の identity_documents 行も ON DELETE CASCADE で削除される (Storage 側のオブジェクト削除はアプリ層 SOP で別途実施)
