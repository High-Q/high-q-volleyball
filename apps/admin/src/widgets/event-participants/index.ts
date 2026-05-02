/**
 * widgets/event-participants の Public API。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

export { default as EventParticipantsWidget } from "./ui/EventParticipantsWidget.vue";
export {
  useEventParticipantsData,
  type UseEventParticipantsData,
} from "./composables/useEventParticipantsData";
