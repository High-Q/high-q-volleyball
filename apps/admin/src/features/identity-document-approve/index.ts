/**
 * features/identity-document-approve の Public API。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 承認アクション)
 *   openspec/changes/admin-identity-document-review/design.md (D7, D11, D16)
 */

export {
  useIdentityDocumentApprove,
  getApproveErrorMessage,
  type UseIdentityDocumentApprove,
} from "./composables/useIdentityDocumentApprove";

export {
  approveIdentityDocument,
  type ApproveError,
} from "./api/approveMutation";

export { default as IdentityDocumentApproveDialog } from "./ui/IdentityDocumentApproveDialog.vue";
