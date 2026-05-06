/**
 * 予約フロー (確認 / 完了 / キャンセル) の Public API。
 *
 * 関連:
 *   openspec/changes/reservation-booking-flow/specs/reservation-booking-flow/spec.md
 */

export {
  BookingApiError,
  insertReservation,
  cancelReservation,
} from "./api/booking-client";
export {
  useBookingDraft,
  pruneExpiredBookingDrafts,
} from "./composables/useBookingDraft";
export type { UseBookingDraftReturn } from "./composables/useBookingDraft";
export {
  useCreateBooking,
} from "./composables/useCreateBooking";
export type { UseCreateBookingReturn } from "./composables/useCreateBooking";
export {
  useCancelBooking,
  isCancellable,
} from "./composables/useCancelBooking";
export type { UseCancelBookingReturn } from "./composables/useCancelBooking";

export { default as BookingForm } from "./ui/BookingForm.vue";
export { default as BookingTotalCard } from "./ui/BookingTotalCard.vue";
export { default as BookingDoneSummary } from "./ui/BookingDoneSummary.vue";
export { default as CancelBookingDialog } from "./ui/CancelBookingDialog.vue";
export { default as BookingSheet } from "./ui/BookingSheet.vue";
