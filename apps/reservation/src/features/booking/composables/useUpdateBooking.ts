import { ref, type Ref } from "vue";
import type {
  BookingError,
  Reservation,
  UpdateBookingInput,
} from "@/entities/reservation";
import { BookingApiError, updateReservation } from "../api/booking-client";
import { isCancellable } from "./useCancelBooking";

export type UseUpdateBookingReturn = {
  submitting: Ref<boolean>;
  error: Ref<BookingError | null>;
  reservation: Ref<Reservation | null>;
  update: (
    input: UpdateBookingInput,
    eventStartAt: string,
  ) => Promise<Reservation | null>;
  reset: () => void;
};

/**
 * 予約内容 (同伴者数 / 連絡事項) の編集 (reservations への UPDATE) を担う composable。
 *
 * - 編集可能期限はキャンセル可能期限と完全一致させる (`isCancellable` を流用)。
 *   開催当日 0:00 JST 以降は API 呼び出しを行わず `not_editable` を返す。
 * - `submitting` で確定中の二重送信防止
 * - `error` は予約フロー全体で共通の `BookingError` を流用
 *
 * 関連:
 *   openspec/changes/reservation-detail-edit/specs/reservation-booking-flow/spec.md
 */
export function useUpdateBooking(): UseUpdateBookingReturn {
  const submitting = ref<boolean>(false);
  const error = ref<BookingError | null>(null);
  const reservation = ref<Reservation | null>(null);

  async function update(
    input: UpdateBookingInput,
    eventStartAt: string,
  ): Promise<Reservation | null> {
    if (submitting.value) {
      return null;
    }
    error.value = null;

    if (!isCancellable(eventStartAt)) {
      error.value = "not_editable";
      return null;
    }

    submitting.value = true;
    try {
      const result = await updateReservation(input);
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

  return { submitting, error, reservation, update, reset };
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
