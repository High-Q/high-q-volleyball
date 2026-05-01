/**
 * features/event-delete の Public API。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 */

export { default as EventDeleteDialog } from "./ui/EventDeleteDialog.vue";
export {
  useEventDelete,
  getDeleteErrorMessage,
  type UseEventDelete,
} from "./composables/useEventDelete";
