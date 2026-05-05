/**
 * features/identity-document-pending-badge の Public API。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D12, D16)
 */

export {
  usePendingCount,
  type UsePendingCount,
} from "./composables/usePendingCount";

export { default as PendingCountBadge } from "./ui/PendingCountBadge.vue";
