/**
 * features/reservation-cancel-by-admin の Public API。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

export { default as ReservationCancelDialog } from "./ui/ReservationCancelDialog.vue";
export {
  useReservationCancelByAdmin,
  getCancelErrorMessage,
  type UseReservationCancelByAdmin,
} from "./composables/useReservationCancelByAdmin";
