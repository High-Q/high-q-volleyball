/**
 * features/reservation-checkin の Public API。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

export { default as CheckinToggle } from "./ui/CheckinToggle.vue";
export {
  useReservationCheckin,
  type UseReservationCheckin,
  type ToggleArgs,
} from "./composables/useReservationCheckin";
