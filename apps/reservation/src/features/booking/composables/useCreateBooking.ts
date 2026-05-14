import { ref, type Ref } from "vue";
import type {
  BookingError,
  CreateBookingInput,
  Reservation,
} from "@/entities/reservation";
import { triggerReservationNotification } from "@/shared/api/reservation-notification";
import { BookingApiError, insertReservation } from "../api/booking-client";

export type UseCreateBookingReturn = {
  submitting: Ref<boolean>;
  error: Ref<BookingError | null>;
  reservation: Ref<Reservation | null>;
  create: (input: CreateBookingInput) => Promise<Reservation | null>;
  reset: () => void;
};

/**
 * 予約作成 (reservations への INSERT) を担う composable。
 *
 * - `submitting` で確認画面の二重送信防止
 * - `error` は Booking 全体のエラー分類 (`@/entities/reservation` の `BookingError`)
 * - `reservation` は INSERT 成功時の返却行
 */
export function useCreateBooking(): UseCreateBookingReturn {
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
      const result = await insertReservation(input);
      reservation.value = result;
      // 予約完了メール送信は fire-and-forget。helper 側で例外を握りつぶしているが、
      // 同期 throw / Promise rejection のどちらも予約成立を妨げないよう二重防衛する。
      try {
        void triggerReservationNotification(result.id as string, "confirmed");
      } catch (notifyErr) {
        console.warn(
          "[useCreateBooking] notification trigger threw (ignored)",
          notifyErr,
        );
      }
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
