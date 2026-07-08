/**
 * widgets/event-form の Public API。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 */

export { default as EventForm } from "./ui/EventForm.vue";
export { useEventForm, type EventFormMode } from "./composables/useEventForm";
export {
  validateEventForm,
  emptyEventForm,
  type EventFormState,
  type ValidationErrors,
  type ValidationResult,
} from "./model/eventFormSchema";
export { seedFromEvent, resolveDuplicateName } from "./model/duplicateSeed";
