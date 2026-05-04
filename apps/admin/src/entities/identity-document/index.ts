/**
 * entities/identity-document の Public API (admin 側)。
 *
 * reservation 側 entities/identity-document (#92) とは別スライスとして独立。
 * 共通の Branded Types / DocumentType enum / labels は @high-q/shared を経由して再利用する。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D16)
 */

export type {
  IdentityDocumentListRow,
  IdentityDocumentDetail,
  IdentityDocumentsListFilter,
  IdentityDocumentsListResult,
  StatusFilter,
  FetchError,
  FetchErrorCode,
  ApproveErrorCode,
  RejectErrorCode,
  MaskDeleteErrorCode,
  ReviewMutationSuccess,
} from "./model/identityDocument.types";

export {
  fetchIdentityDocumentsList,
  getIdentityDocumentById,
  fetchPendingCount,
} from "./api/identityDocumentQueries";

export { getSignedUrl } from "./api/getSignedUrl";
