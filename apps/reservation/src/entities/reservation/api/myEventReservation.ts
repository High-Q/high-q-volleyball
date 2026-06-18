import { unsafeReservationId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  EventId,
  MemberId,
  ReservationId,
  ReservationStatus,
} from "../model/reservation.types";

/**
 * 当該会員の「当該イベントに対する」予約状態 (CTA 分岐用の最小情報)。
 *
 * `(event_id, member_id)` は UNIQUE のため最大 1 行。`status` には `cancelled` /
 * `waitlist` も含まれ得る。CTA 分岐側で status を解釈する。
 */
export type MyEventReservation = {
  id: ReservationId;
  status: ReservationStatus;
  guestCount: number;
  note: string;
};

type MyEventReservationRow = {
  id: string;
  status: ReservationStatus;
  guest_count: number;
  note: string | null;
};

/**
 * 当該会員の当該イベントに対する予約行を取得する。
 *
 * - `event_id` AND `member_id` の双方を WHERE 句に明示し、RLS (`member_id = auth.uid()`)
 *   への単独依存を避けて二重防衛とする。
 * - 行が存在しない場合は `null` を返し、呼び出し側は「未登録」として扱う。
 *
 * 関連:
 *   openspec/changes/reservation-waitlist-registration/specs/reservation-waitlist-registration/spec.md
 *   (「自己予約状態の取得」要件)
 */
export async function fetchMyEventReservation(
  eventId: EventId | string,
  uid: MemberId | string,
): Promise<MyEventReservation | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reservations")
    .select("id, status, guest_count, note")
    .eq("event_id", eventId as string)
    .eq("member_id", uid as string)
    .maybeSingle();

  if (error !== null) {
    throw error;
  }
  if (data === null) {
    return null;
  }
  const row = data as unknown as MyEventReservationRow;
  return {
    id: unsafeReservationId(row.id),
    status: row.status,
    guestCount: row.guest_count,
    note: row.note ?? "",
  };
}
