/**
 * features/reservation-guest-edit の Public API。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

export { default as GuestCountStepper } from "./ui/GuestCountStepper.vue";
export {
  useReservationGuestEdit,
  type UseReservationGuestEdit,
  type SetGuestArgs,
} from "./composables/useReservationGuestEdit";
