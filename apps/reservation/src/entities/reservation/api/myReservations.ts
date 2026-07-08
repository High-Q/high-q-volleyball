import {
  unsafeEventId,
  unsafeMemberId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type { EventAvailability } from "@/entities/event";
import type {
  EventId,
  MemberId,
  ReservationId,
  ReservationStatus,
} from "../model/reservation.types";

type AvailabilityRow = {
  event_id: string;
  capacity: number | null;
  reserved_count: number;
};

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
    /** 回号。開催日時順に自動採番。NULL=未採番 */
    vol: number | null;
    /** 予約埋まり具合 (Issue #305)。取得失敗時は null */
    availability: EventAvailability | null;
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
    vol: number | null;
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
      "id, status, guest_count, cancelled_at, event_id, member_id, events(id, name, start_at, end_at, fee, vol, venue_id, venues(name, default_fee))",
    )
    .eq("member_id", uid as string)
    .order("start_at", { foreignTable: "events", ascending: false });
  if (error !== null) {
    throw error;
  }
  if (data === null) {
    return [];
  }
  const items = (data as unknown as MyReservationRow[])
    .filter((row): row is MyReservationRow & { events: NonNullable<MyReservationRow["events"]> } => row.events !== null)
    .map(rowToItem);
  if (items.length === 0) {
    return items;
  }
  const eventIds = items.map((i) => i.event.id);
  const availabilityMap = await fetchAvailabilityMap(eventIds);
  return items.map((i) => ({
    ...i,
    event: {
      ...i.event,
      availability: availabilityMap.get(i.event.id) ?? null,
    },
  }));
}

/**
 * `event_availability_view` から複数 event_id の予約埋まり具合を取得する。
 * 取得失敗時は空 Map を返し、呼び出し側で各 event に `availability: null` が割り当てられる
 * (主データの描画を阻害しないため、ここで throw しない)。
 */
async function fetchAvailabilityMap(
  ids: string[],
): Promise<Map<string, EventAvailability>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("event_availability_view")
    .select("event_id, capacity, reserved_count")
    .in("event_id", ids);
  if (error || data === null) {
    return new Map();
  }
  const map = new Map<string, EventAvailability>();
  for (const row of data as unknown as AvailabilityRow[]) {
    map.set(row.event_id, {
      eventId: unsafeEventId(row.event_id),
      capacity: row.capacity,
      reservedCount: row.reserved_count,
    });
  }
  return map;
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
      vol: row.events.vol ?? null,
      availability: null,
    },
  };
}
