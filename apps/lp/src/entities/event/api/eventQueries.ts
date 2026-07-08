import { queryOptions } from "@tanstack/vue-query";
import { getSupabase } from "@shared/api";

export interface LpEvent {
  id: string;
  name: string;
  start: Date;
  end: Date;
  location: string;
  /** 回号。開催日時順に自動採番。NULL は未採番。 */
  vol: number | null;
}

interface EventRow {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  vol: number | null;
  venues: { name: string } | { name: string }[] | null;
}

async function fetchEvents(): Promise<LpEvent[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("events")
    .select("id, name, start_at, end_at, vol, venues(name)")
    .eq("visibility", "published")
    .gte("start_at", new Date().toISOString())
    .order("start_at", { ascending: true });

  if (error) {
    throw new Error(error.message || "failed to fetch events");
  }
  return ((data ?? []) as unknown as EventRow[]).map((row) => {
    const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
    return {
      id:       row.id,
      name:     row.name,
      start:    new Date(row.start_at),
      end:      new Date(row.end_at),
      location: venue?.name ?? "",
      vol:      row.vol ?? null,
    };
  });
}

export const eventQueryOptions = {
  list: () =>
    queryOptions({
      queryKey: ["events"] as const,
      queryFn:  fetchEvents,
    }),
};
