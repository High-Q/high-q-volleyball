import { ref, type Ref } from "vue";
import type { BookingError, ReservationId } from "@/entities/reservation";
import { jstStartOfDay } from "@/shared/lib/jst-calendar";
import { triggerReservationNotification } from "@/shared/api/reservation-notification";
import {
  BookingApiError,
  cancelReservation,
  cancelWaitlistReservation,
} from "../api/booking-client";

export type UseCancelBookingReturn = {
  submitting: Ref<boolean>;
  error: Ref<BookingError | null>;
  cancel: (id: ReservationId) => Promise<boolean>;
  /** キャンセル待ちの取り消し (waitlist→cancelled)。通知メールは送らない */
  cancelWaitlist: (id: ReservationId) => Promise<boolean>;
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
      // キャンセル完了メール送信は fire-and-forget。helper 側で例外を握りつぶしているが、
      // 同期 throw / Promise rejection のどちらもキャンセル成立を妨げないよう二重防衛する。
      try {
        void triggerReservationNotification(id as string, "cancelled");
      } catch (notifyErr) {
        console.warn(
          "[useCancelBooking] notification trigger threw (ignored)",
          notifyErr,
        );
      }
      return true;
    } catch (cause) {
      error.value = mapErrorToBookingError(cause);
      return false;
    } finally {
      submitting.value = false;
    }
  }

  async function cancelWaitlist(id: ReservationId): Promise<boolean> {
    if (submitting.value) {
      return false;
    }
    submitting.value = true;
    error.value = null;
    try {
      await cancelWaitlistReservation(id);
      // キャンセル待ちの取り消しは通知メールを送らない (登録時に送っていないため対称)。
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

  return { submitting, error, cancel, cancelWaitlist, reset };
}

/**
 * 開催前日中 (= JST 開催日 0:00 未満) のみキャンセル可能。
 *
 * 例: 開催 2026-05-15 19:30 JST のとき、キャンセル可能なのは 2026-05-14 23:59 JST まで。
 *     2026-05-15 00:00 JST 以降は不可となり、UI 上は LINE オープンチャットへの連絡導線のみ。
 *
 * `events.cancel_deadline` 列は MVP1 では参照しない (運用上の期限はアプリ側で
 * 「JST 前日中まで」に統一する方針)。
 */
export function isCancellable(
  eventStartAt: string,
  now: Date = new Date(),
): boolean {
  const start = new Date(eventStartAt);
  if (Number.isNaN(start.getTime())) {
    return false;
  }
  // JST カレンダー日付の比較。`now` の JST 日 < `start` の JST 日 のときのみ可
  // (= JST 前日 23:59:59 までは可、JST 開催日 00:00 以降は不可)。
  const startJstDay = jstStartOfDay(start).getTime();
  const nowJstDay = jstStartOfDay(now).getTime();
  return nowJstDay < startJstDay;
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
