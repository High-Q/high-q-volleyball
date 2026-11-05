/**
 * entities/identity-document-download の Public API。
 *
 * #172 役所提出用一括ダウンロードの監査ログ（`identity_document_downloads`）。
 */

export type {
  IdentityDocumentDownloadInput,
  DownloadAuditError,
  DownloadAuditErrorCode,
} from "./model/identityDocumentDownload.types";

export { insertDownloadAudit } from "./api/identityDocumentDownloadClient";
