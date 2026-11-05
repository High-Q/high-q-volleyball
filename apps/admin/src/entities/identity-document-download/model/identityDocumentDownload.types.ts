import type { IdentityDocumentId, MemberId } from "@high-q/shared";

/**
 * #172 役所提出用一括ダウンロードの監査ログ entity 型。
 *
 * `identity_document_downloads` テーブル（追記専用・admin のみ）への INSERT 入力。
 * `member_count` / `document_count` は呼び出し側では渡さず、配列長から導出して
 * 配列と件数の不整合を構造的に防ぐ（api layer を参照）。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-bulk-export/specs/data-schema/spec.md
 *   openspec/changes/admin-identity-document-bulk-export/specs/rls-policies/spec.md
 *   同 design.md (D6)
 */
export interface IdentityDocumentDownloadInput {
  /** ダウンロードを実行した admin の member id。 */
  downloaded_by: MemberId;
  /** ZIP に含めた書類の所有会員 id 群。 */
  member_ids: MemberId[];
  /** ZIP に実際に含めた identity_documents.id 群。 */
  document_ids: IdentityDocumentId[];
  /** 任意の補足メモ。 */
  note?: string | null;
}

export type DownloadAuditErrorCode = "DB_FAILED" | "NETWORK_ERROR";

export interface DownloadAuditError {
  code: DownloadAuditErrorCode;
  message: string;
}
