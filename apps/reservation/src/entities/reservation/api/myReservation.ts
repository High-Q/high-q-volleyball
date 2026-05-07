import {
  unsafeEventId,
  unsafeReservationId,
} from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  MemberId,
  MyReservationDetail,
  ReservationId,
  ReservationStatus,
} from "../model/reservation.types";

/**
 * 予約詳細画面用の単一取得 API。
 *
 * - `reservations × events × venues × members` を JOIN し、`reservations.id = reservationId`
 *   AND `reservations.member_id = uid` の条件で 1 行を取得する。
 * - RLS により他会員の予約は 0 行となるが、アプリ層でも `.eq("member_id", uid)` を明示して
 *   二重防衛とする (RLS 単独依存を避ける)。
 * - 0 行ヒット (= 自分の予約ではない / 存在しない) は 404 を意味する `null` を返す。403 ではなく
 *   404 として扱うことで「その予約が存在する」事実の漏洩を防ぐ。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 */
type MyReservationDetailRow = {
  id: string;
  status: ReservationStatus;
  guest_count: number;
  created_at: string;
  cancelled_at: string | null;
  member_id: string;
  events: {
    id: string;
    name: string;
    start_at: string;
    end_at: string;
    fee: number | null;
    venue_id: string;
    venues: {
      name: string;
      default_fee: number | null;
    } | null;
  } | null;
};

export async function fetchMyReservation(
  reservationId: ReservationId | string,
  uid: MemberId | string,
): Promise<MyReservationDetail | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, status, guest_count, created_at, cancelled_at, member_id, events(id, name, start_at, end_at, fee, venue_id, venues(name, default_fee))",
    )
    .eq("id", reservationId as string)
    .eq("member_id", uid as string)
    .maybeSingle();
  if (error !== null) {
    throw error;
  }
  if (data === null) {
    return null;
  }
  const row = data as unknown as MyReservationDetailRow;
  if (row.events === null) {
    return null;
  }
  return rowToDetail(
    row as MyReservationDetailRow & {
      events: NonNullable<MyReservationDetailRow["events"]>;
    },
  );
}

function rowToDetail(
  row: MyReservationDetailRow & {
    events: NonNullable<MyReservationDetailRow["events"]>;
  },
): MyReservationDetail {
  return {
    id: unsafeReservationId(row.id),
    status: row.status,
    guestCount: row.guest_count,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    event: {
      id: unsafeEventId(row.events.id),
      name: row.events.name,
      startAt: row.events.start_at,
      endAt: row.events.end_at,
      fee: row.events.fee ?? row.events.venues?.default_fee ?? null,
      venueName: row.events.venues?.name ?? "",
    },
  };
}
