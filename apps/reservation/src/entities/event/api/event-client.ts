import { unsafeEventId, unsafeVenueId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  EventAvailability,
  EventDetail,
  EventListItem,
  EventRow,
} from "../model/event.types";

type AvailabilityRow = {
  event_id: string;
  capacity: number | null;
  reserved_count: number;
};

/** 一覧クエリ: status='scheduled' AND visibility='published' AND start_at >= now() を満たすイベントを開催日昇順で返す */
export async function fetchUpcomingEvents(): Promise<EventListItem[]> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, name, start_at, end_at, venue_id, fee, status, visibility, venues(name, default_fee)",
    )
    .eq("status", "scheduled")
    .eq("visibility", "published")
    .gte("start_at", nowIso)
    .order("start_at", { ascending: true });
  if (error) {
    throw error;
  }
  if (data === null) {
    return [];
  }
  const events = (data as unknown as EventRow[]).map(rowToEventListItem);
  if (events.length === 0) {
    return events;
  }
  const availabilityMap = await fetchAvailabilityMap(events.map((e) => e.id));
  return events.map((e) => ({
    ...e,
    availability: availabilityMap.get(e.id) ?? null,
  }));
}

/** 詳細クエリ: 単一イベントの会場名 + 集合場所を含めた取得 */
export async function fetchEventDetail(
  id: string,
): Promise<EventDetail | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, name, start_at, end_at, venue_id, fee, status, visibility, venues(name, meeting_point, default_fee, map_url)",
    )
    .eq("id", id)
    .eq("status", "scheduled")
    .eq("visibility", "published")
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (data === null) {
    return null;
  }
  const detail = rowToEventDetail(data as unknown as EventRow);
  const availability = await fetchAvailabilityOne(id);
  return { ...detail, availability };
}

/**
 * `event_availability_view` から複数 event_id の予約埋まり具合を取得し、Map で返す。
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
    map.set(row.event_id, rowToAvailability(row));
  }
  return map;
}

/**
 * 単一 event_id の予約埋まり具合を取得する。取得失敗時は null を返し、
 * 詳細画面側で fallback 表示する。主データは継続描画される。
 */
async function fetchAvailabilityOne(
  id: string,
): Promise<EventAvailability | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("event_availability_view")
    .select("event_id, capacity, reserved_count")
    .eq("event_id", id)
    .maybeSingle();
  if (error || data === null) {
    return null;
  }
  return rowToAvailability(data as unknown as AvailabilityRow);
}

function rowToAvailability(row: AvailabilityRow): EventAvailability {
  return {
    eventId: unsafeEventId(row.event_id),
    capacity: row.capacity,
    reservedCount: row.reserved_count,
  };
}

function resolveFee(row: EventRow): number | null {
  if (row.fee !== null) {
    return row.fee;
  }
  return row.venues?.default_fee ?? null;
}

function rowToEventListItem(row: EventRow): EventListItem {
  return {
    id: unsafeEventId(row.id),
    name: row.name,
    startAt: row.start_at,
    endAt: row.end_at,
    venueId: unsafeVenueId(row.venue_id),
    venueName: row.venues?.name ?? "",
    fee: resolveFee(row),
    availability: null,
  };
}

function rowToEventDetail(row: EventRow): EventDetail {
  return {
    ...rowToEventListItem(row),
    meetingPoint: row.venues?.meeting_point ?? "現地集合",
    mapUrl: row.venues?.map_url ?? null,
  };
}
