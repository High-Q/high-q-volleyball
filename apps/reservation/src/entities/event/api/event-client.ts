import { unsafeEventId, unsafeVenueId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type { EventDetail, EventListItem, EventRow } from "../model/event.types";

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
  return (data as unknown as EventRow[]).map(rowToEventListItem);
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
  return rowToEventDetail(data as unknown as EventRow);
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
  };
}

function rowToEventDetail(row: EventRow): EventDetail {
  return {
    ...rowToEventListItem(row),
    meetingPoint: row.venues?.meeting_point ?? "現地集合",
    mapUrl: row.venues?.map_url ?? null,
  };
}
