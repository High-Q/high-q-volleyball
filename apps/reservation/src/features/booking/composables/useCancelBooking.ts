import { ref, type Ref } from "vue";
import type { BookingError, ReservationId } from "@/entities/reservation";
import { BookingApiError, cancelReservation } from "../api/booking-client";

export type UseCancelBookingReturn = {
  submitting: Ref<boolean>;
  error: Ref<BookingError | null>;
  cancel: (id: ReservationId) => Promise<boolean>;
  reset: () => void;
};

/**
 * 予約キャンセル (reservations.status の `'reserved' → 'cancelled'` UPDATE) を担う composable。
 *
 * - `submitting` で確認ダイアログの二重実行防止
 * - `error` は Booking 全体のエラー分類 (`@/entities/reservation` の `BookingError`)
 * - キャンセル可否判定 (`events.start_at > now()`) は呼び出し側 UI 層が行い、
 *   本 composable では UPDATE と RLS / 0 行更新エラーの区別のみを担う
 */
export function useCancelBooking(): UseCancelBookingReturn {
  const submitting = ref<boolean>(false);
  const error = ref<BookingError | null>(null);

  async function cancel(id: ReservationId): Promise<boolean> {
    if (submitting.value) {
      return false;
    }
    submitting.value = true;
    error.value = null;
    try {
      await cancelReservation(id);
      return true;
    } catch (cause) {
      error.value = mapErrorToBookingError(cause);
      return false;
    } finally {
      submitting.value = false;
    }
  }

  function reset(): void {
    error.value = null;
  }

  return { submitting, error, cancel, reset };
}

/**
 * `events.start_at > now()` のときのみキャンセル可能。
 * `events.cancel_deadline` は MVP1 では参照しない (MVP2 で別 Issue 化)。
 */
export function isCancellable(
  eventStartAt: string,
  now: Date = new Date(),
): boolean {
  const start = Date.parse(eventStartAt);
  if (Number.isNaN(start)) {
    return false;
  }
  return start > now.getTime();
}

function mapErrorToBookingError(cause: unknown): BookingError {
  if (cause instanceof BookingApiError) {
    if (cause.kind === "rls") {
      return "rls";
    }
    return "network";
  }
  return "unknown";
}
