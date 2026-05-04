## MODIFIED Requirements

### Requirement: identity_documents テーブル

システムは `identity_documents` テーブルを以下の列で定義 MUST する: `id` (UUID PK)、`member_id` (uuid NOT NULL references members(id) ON DELETE CASCADE)、`document_type` (text CHECK in 10 種類)、`storage_path_front` (text NOT NULL — Supabase Storage 内の表面画像キー)、`storage_path_back` (text NULL — Supabase Storage 内の裏面画像キー、任意提出時のみ値を持つ)、`status` (text CHECK in `'pending'`,`'approved'`,`'rejected'`、default `'pending'`)、`rejection_reason` (text NULL)、`uploaded_at` (timestamptz default now)、`reviewed_at` (timestamptz NULL — null = 未確認)、`reviewed_by` (uuid NULL references members(id) ON DELETE SET NULL)。

`document_type` の許容値は次の 10 種類: `'drivers_license'` / `'driving_history_cert'` / `'residence_certificate'` / `'disability_certificate'` / `'residence_card'` / `'special_permanent_resident_cert'` / `'student_id'` / `'passport'` / `'my_number_card_masked'` / `'health_insurance_cert'`。

旧 `storage_path` 列 (text NOT NULL) は本 change で `storage_path_front` に RENAME MUST する (本番 DB は 0 行のため互換維持不要)。`storage_path_back` は新規追加列で、表裏 2 ファイル提出時の裏面パスを保持する SHALL。

#### Scenario: 表面のみの提出
- **WHEN** `INSERT INTO identity_documents (member_id, document_type, storage_path_front, status) VALUES (?, 'drivers_license', '<uid>/<doc-id>-front.jpg', 'pending')`
- **THEN** 行が作成され、`storage_path_back` は NULL のまま (任意提出のため)

#### Scenario: 表裏両面の提出
- **WHEN** `INSERT INTO identity_documents (member_id, document_type, storage_path_front, storage_path_back, status) VALUES (?, 'drivers_license', '<uid>/<doc-id>-front.jpg', '<uid>/<doc-id>-back.jpg', 'pending')`
- **THEN** 行が作成され、表裏両方のパスが 1 行で保持される

#### Scenario: 表面パス省略は不可
- **WHEN** `storage_path_front` を NULL のまま INSERT しようとする
- **THEN** NOT NULL 制約違反でエラーとなる (表面は常に必須)

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

### Requirement: Storage バケット identity-documents

システムは Supabase Storage に `identity-documents` という private バケットを作成 MUST する。バケット内のオブジェクト名は `<member_id>/<document_id>-(front|back).<ext>` 形式で命名 SHALL する。表面オブジェクトは常に存在し、裏面オブジェクトは任意 (`storage_path_back IS NOT NULL` のときのみ存在) SHALL する。

#### Scenario: 公開アクセス禁止
- **WHEN** 未認証ユーザーが バケット内オブジェクトに直接 URL でアクセス
- **THEN** 403 Forbidden が返る (バケット public フラグは false)

#### Scenario: ファイル名の安全性
- **WHEN** アプリが画像を upload する
- **THEN** ファイル名は `<member_id>/<document_id>-(front|back).(jpg|png|heic|heif)` 形式に正規化される (member_id をディレクトリ階層に持たせ RLS と整合)

#### Scenario: 表裏のペアリング
- **WHEN** 同じ `<document_id>` で `<...>-front.jpg` と `<...>-back.jpg` がアップロードされる
- **THEN** 両者は同一の `identity_documents.id` 行の `storage_path_front` / `storage_path_back` から参照され、admin レビューで対応関係が一意に判定可能

#### Scenario: 裏面のみ削除 (将来 Phase)
- **WHEN** admin が `storage_path_back` の Storage オブジェクトのみを削除し、DB 上 `storage_path_back = NULL` に UPDATE
- **THEN** 表面のみ提出として扱われる (本 change のスコープ外、Phase 2 で admin 機能として検討)
