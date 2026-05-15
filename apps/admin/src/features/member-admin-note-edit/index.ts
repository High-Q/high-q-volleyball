/**
 * features/member-admin-note-edit — 運営メモ編集の Public API。
 *
 * 関連: openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 */

export {
  useAdminNoteEdit,
  ADMIN_NOTE_MAX_LENGTH,
  type UseAdminNoteEditOptions,
  type UseAdminNoteEdit,
} from "./composables/useAdminNoteEdit";
export { default as AdminNoteEditForm } from "./ui/AdminNoteEditForm.vue";
