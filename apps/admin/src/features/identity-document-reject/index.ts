/**
 * features/identity-document-reject の Public API。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 差し戻しアクション / 連鎖予約キャンセル)
 *   openspec/changes/admin-identity-document-review/design.md (D8, D9, D11, D23, D16)
 */

export {
  useIdentityDocumentReject,
  getRejectErrorMessage,
  MAX_REASON_LENGTH,
  type UseIdentityDocumentReject,
  type RejectPhase,
  type ReviewSuccess,
} from "./composables/useIdentityDocumentReject";

export {
  rejectIdentityDocument,
  type RejectError,
  type RejectInput,
} from "./api/rejectMutation";

export {
  buildRejectMailBody,
  buildRejectMailtoHref,
  REJECT_MAIL_SUBJECT,
} from "./templates/rejectMailBody";

export { default as IdentityDocumentRejectDialog } from "./ui/IdentityDocumentRejectDialog.vue";
