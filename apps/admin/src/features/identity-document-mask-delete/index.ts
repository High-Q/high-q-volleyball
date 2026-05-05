/**
 * features/identity-document-mask-delete の Public API。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: マスク漏れ即時削除アクション)
 *   openspec/changes/admin-identity-document-review/design.md (D10, D23, D16)
 */

export {
  useIdentityDocumentMaskDelete,
  getMaskDeleteErrorMessage,
  type UseIdentityDocumentMaskDelete,
  type MaskDeletePhase,
} from "./composables/useIdentityDocumentMaskDelete";

export {
  maskDeleteIdentityDocument,
  MASK_DELETE_FIXED_REASON,
  type MaskDeleteError,
  type MaskDeleteInput,
} from "./api/maskDeleteMutation";

export {
  buildMaskDeleteMailBody,
  buildMaskDeleteMailtoHref,
  MASK_DELETE_MAIL_SUBJECT,
} from "./templates/maskDeleteMailBody";

export { default as IdentityDocumentMaskDeleteDialog } from "./ui/IdentityDocumentMaskDeleteDialog.vue";
