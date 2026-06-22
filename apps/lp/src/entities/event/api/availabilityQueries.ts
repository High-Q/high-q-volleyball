import { queryOptions } from "@tanstack/vue-query";
import { getSupabase } from "@shared/api";

import type { EventAvailability } from "../model/event.types";

interface AvailabilityRow {
  event_id: string;
  capacity: number | null;
  reserved_count: number;
}

/**
 * 表示対象イベント ID 群の残席集計を event_availability_view から取得し、
 * event_id をキーにしたマップで返す。取得列は集計3列のみに限定し、
 * 予約者の個人情報は取得しない（anon 公開の不変条件）。
 */
async function fetchAvailabilityMap(
  ids: string[],
): Promise<Map<string, EventAvailability>> {
  const map = new Map<string, EventAvailability>();
  if (ids.length === 0) {
    return map;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("event_availability_view")
    .select("event_id, capacity, reserved_count")
    .in("event_id", ids);

  if (error) {
    throw new Error(error.message || "failed to fetch availability");
  }

  for (const row of (data ?? []) as unknown as AvailabilityRow[]) {
    map.set(row.event_id, {
      eventId:       row.event_id,
      capacity:      row.capacity,
      reservedCount: row.reserved_count,
    });
  }
  return map;
}

export const availabilityQueryOptions = {
  byIds: (ids: string[]) =>
    queryOptions({
      queryKey: ["event-availability", ids] as const,
      queryFn:  () => fetchAvailabilityMap(ids),
      enabled:  ids.length > 0,
    }),
};
