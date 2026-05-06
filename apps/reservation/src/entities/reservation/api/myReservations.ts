import {
  unsafeEventId,
  unsafeMemberId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  EventId,
  MemberId,
  ReservationId,
  ReservationStatus,
} from "../model/reservation.types";

/**
 * プロフィール画面 (/profile) で表示する自分の予約 + 紐付くイベント要約。
 *
 * - `reservations × events × venues` を JOIN し、自分の予約だけを start_at DESC で取得する
 * - RLS により `member_id = auth.uid()` 条件は冗長だが明示する (二重防衛)
 * - 集計 (累計参加 / 最終参加 / 次回予定) はクライアント側で本配列から JS で算出する
 */
export type MyReservationItem = {
  id: ReservationId;
  status: ReservationStatus;
  guestCount: number;
  cancelledAt: string | null;
  event: {
    id: EventId;
    name: string;
    startAt: string;
    endAt: string;
    fee: number | null;
    venueName: string;
  };
};

type MyReservationRow = {
  id: string;
  status: ReservationStatus;
  guest_count: number;
  cancelled_at: string | null;
  event_id: string;
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

export async function fetchMyReservations(
  uid: MemberId | string,
): Promise<MyReservationItem[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reservations")
    .select(
      "id, status, guest_count, cancelled_at, event_id, member_id, events(id, name, start_at, end_at, fee, venue_id, venues(name, default_fee))",
    )
    .eq("member_id", uid as string)
    .order("start_at", { foreignTable: "events", ascending: false });
  if (error !== null) {
    throw error;
  }
  if (data === null) {
    return [];
  }
  return (data as unknown as MyReservationRow[])
    .filter((row): row is MyReservationRow & { events: NonNullable<MyReservationRow["events"]> } => row.events !== null)
    .map(rowToItem);
}

function rowToItem(
  row: MyReservationRow & { events: NonNullable<MyReservationRow["events"]> },
): MyReservationItem {
  void unsafeMemberId(row.member_id); // brand validation only
  void unsafeVenueId(row.events.venue_id);
  return {
    id: unsafeReservationId(row.id),
    status: row.status,
    guestCount: row.guest_count,
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
