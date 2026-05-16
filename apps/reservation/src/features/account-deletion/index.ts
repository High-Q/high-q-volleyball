export { default as AccountDeletionSection } from "./ui/AccountDeletionSection.vue";
export { default as AccountDeletionDialog } from "./ui/AccountDeletionDialog.vue";
export {
  useAccountDeletion,
  getDeletionErrorMessage,
  type DeletionError,
  type UseAccountDeletion,
} from "./composables/useAccountDeletion";
