## ADDED Requirements

### Requirement: identity_document_downloads テーブル

システムは MUST 役所提出用一括ダウンロードの監査ログを保持する `identity_document_downloads` テーブルを以下の列で定義する SHALL:

- `id` (UUID PK, default `gen_random_uuid()`)
- `downloaded_by` (uuid NULL references members(id) ON DELETE SET NULL — ダウンロードを実行した admin の member id。会員削除後もログを保持するため SET NULL)
- `downloaded_at` (timestamptz NOT NULL default now())
- `member_ids` (uuid[] NOT NULL — ZIP に含めた書類の所有会員 id 群)
- `document_ids` (uuid[] NOT NULL — ZIP に実際に含めた identity_documents.id 群)
- `member_count` (int NOT NULL — `member_ids` の件数)
- `document_count` (int NOT NULL — `document_ids` の件数)
- `note` (text NULL — 任意の補足メモ)

本テーブルは MUST 追記専用の監査ログとして扱い、UPDATE / DELETE を業務フローで行わない SHALL。書類の実体（画像）は保持せず、参照した書類 id のみを記録する。

#### Scenario: 監査ログ行の作成
- **WHEN** `INSERT INTO identity_document_downloads (downloaded_by, member_ids, document_ids, member_count, document_count) VALUES (<admin_id>, ARRAY[<m1>,<m2>], ARRAY[<d1>,<d2>,<d3>], 2, 3)`
- **THEN** 1 行が作成され、`downloaded_at` が now() で自動設定される

#### Scenario: 実行 admin が削除されてもログは残る
- **WHEN** `downloaded_by` が参照する member が後で削除される
- **THEN** ON DELETE SET NULL により当該ログ行の `downloaded_by` は NULL になり、ログ行自体は保持される

#### Scenario: 画像実体を持たない
- **WHEN** identity_document_downloads の行を作成する
- **THEN** 列に画像 BLOB は持たず、`document_ids` から identity_documents を参照する形で「どの書類を取り出したか」を表現する
