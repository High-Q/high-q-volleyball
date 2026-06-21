import { ref, type Ref } from "vue";
import type {
  BookingError,
  CreateBookingInput,
  Reservation,
} from "@/entities/reservation";
import { BookingApiError, insertWaitlist } from "../api/booking-client";

export type UseCreateWaitlistReturn = {
  submitting: Ref<boolean>;
  error: Ref<BookingError | null>;
  reservation: Ref<Reservation | null>;
  create: (input: CreateBookingInput) => Promise<Reservation | null>;
  reset: () => void;
};

/**
 * キャンセル待ち登録 (reservations への status='waitlist' INSERT) を担う composable。
 *
 * - `useCreateBooking` と対称だが、**通知メールは送らない** (design D5)。価値の高い
 *   「枠が空きました」通知は admin 側の繰り上げフロー (#154) の責務。
 * - `submitting` で確定処理の二重送信防止
 * - `error` は Booking 全体のエラー分類 (`BookingError`)
 * - `reservation` は INSERT / 再活性化成功時の返却行 (status='waitlist')
 */
export function useCreateWaitlist(): UseCreateWaitlistReturn {
  const submitting = ref<boolean>(false);
  const error = ref<BookingError | null>(null);
  const reservation = ref<Reservation | null>(null);

  async function create(
    input: CreateBookingInput,
  ): Promise<Reservation | null> {
    if (submitting.value) {
      return null;
    }
    submitting.value = true;
    error.value = null;
    try {
      const result = await insertWaitlist(input);
      reservation.value = result;
      return result;
    } catch (cause) {
      error.value = mapErrorToBookingError(cause);
      return null;
    } finally {
      submitting.value = false;
    }
  }

  function reset(): void {
    error.value = null;
    reservation.value = null;
  }

  return { submitting, error, reservation, create, reset };
}

function mapErrorToBookingError(cause: unknown): BookingError {
  if (cause instanceof BookingApiError) {
    if (cause.kind === "duplicate") {
      return "duplicate";
    }
    if (cause.kind === "rls") {
      return "rls";
    }
    return "network";
  }
  return "unknown";
}
