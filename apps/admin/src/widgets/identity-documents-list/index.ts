/**
 * widgets/identity-documents-list の Public API。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D16)
 */

export { default as IdentityDocumentsListWidget } from "./ui/IdentityDocumentsListWidget.vue";
export { useIdentityDocumentsListData } from "./composables/useIdentityDocumentsListData";
