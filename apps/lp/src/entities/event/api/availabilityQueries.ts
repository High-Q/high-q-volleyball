import { queryOptions } from "@tanstack/vue-query";
import { getSupabase } from "@shared/api";

import type { EventAvailability } from "../model/event.types";

interface AvailabilityRow {
  event_id: string;
  capacity: number | null;
  reserved_count: number;
}

/**
 * 表示対象イベント ID 群の残席集計を get_event_availability(RPC) から取得し、
 * event_id をキーにしたマップで返す。返る列は集計3列のみで、
 * 予約者の個人情報は含まない（anon 公開の不変条件）。
 * 取得失敗時は空マップを返す（残席は非クリティカル表示のため error を投げず、
 * ロールアウト窓や一時障害でも残席非表示に留めて主データ描画を妨げない）。
 */
async function fetchAvailabilityMap(
  ids: string[],
): Promise<Map<string, EventAvailability>> {
  const map = new Map<string, EventAvailability>();
  if (ids.length === 0) {
    return map;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_event_availability", {
    p_event_ids: ids,
  });

  if (error || data === null) {
    return map;
  }

  for (const row of data as unknown as AvailabilityRow[]) {
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
