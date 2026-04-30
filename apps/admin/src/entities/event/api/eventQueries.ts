import { type Result, ok, err, appError } from "@high-q/shared";
import type { VenueId, EventVisibility } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  EventListRow,
  Period,
  SortDir,
  SortKey,
} from "../model/event.types";

/**
 * `event_list_view` を fetch する API layer。
 *
 * 関連:
 *   openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *   openspec/changes/admin-events-list-screen/design.md (D1, §5)
 */

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED";

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}

export interface EventsListFilter {
  period: Period;
  venueId?: VenueId;
  visibility?: EventVisibility;
  search: string;
  sort: SortKey;
  dir: SortDir;
  page: number;
  per: number;
}

export interface EventsListResult {
  rows: EventListRow[];
  total: number;
}

const SORT_COLUMN: Record<SortKey, string> = {
  date: "start_at",
  status: "visibility",
};

interface PeriodRange {
  gte?: { column: "start_at"; value: string };
  lt?: { column: "end_at" | "start_at"; value: string };
}

function periodRange(period: Period, now: Date): PeriodRange {
  if (period === "all") return {};
  if (period === "upcoming") {
    return { gte: { column: "start_at", value: now.toISOString() } };
  }
  if (period === "past-all") {
    return { lt: { column: "end_at", value: now.toISOString() } };
  }
  // this-month / last-month: JST 起点で月初〜次月初を出す
  const TZ_OFFSET_MIN = 9 * 60;
  const jstNow = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const monthOffset = period === "this-month" ? 0 : -1;
  const start = new Date(Date.UTC(year, month + monthOffset, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + monthOffset + 1, 1, 0, 0, 0));
  // JST 月初を UTC で表現するため -9h 補正
  const startUtc = new Date(start.getTime() - TZ_OFFSET_MIN * 60_000);
  const endUtc = new Date(end.getTime() - TZ_OFFSET_MIN * 60_000);
  return {
    gte: { column: "start_at", value: startUtc.toISOString() },
    lt: { column: "start_at", value: endUtc.toISOString() },
  };
}

function classifyError(error: { code?: string; message: string }): FetchErrorCode {
  if (
    error.code === "42501" ||
    /permission/i.test(error.message)
  ) {
    return "PERMISSION_DENIED";
  }
  return "SERVER_ERROR";
}

export async function fetchEventsList(
  filter: EventsListFilter,
  now: Date = new Date(),
): Promise<Result<EventsListResult, FetchError>> {
  const supabase = getSupabase();

  try {
    let query = supabase
      .from("event_list_view")
      .select("*", { count: "exact" });

    const range = periodRange(filter.period, now);
    if (range.gte) {
      query = query.gte(range.gte.column, range.gte.value);
    }
    if (range.lt) {
      query = query.lt(range.lt.column, range.lt.value);
    }

    if (filter.venueId !== undefined) {
      query = query.eq("venue_id", filter.venueId as unknown as string);
    }
    if (filter.visibility !== undefined) {
      query = query.eq("visibility", filter.visibility);
    }
    if (filter.search.length > 0) {
      const escaped = filter.search.replace(/[,]/g, " ");
      query = query.or(
        `name.ilike.%${escaped}%,venue_name.ilike.%${escaped}%`,
      );
    }

    query = query.order(SORT_COLUMN[filter.sort], {
      ascending: filter.dir === "asc",
    });

    const start = (filter.page - 1) * filter.per;
    const end = start + filter.per - 1;
    const { data, error, count } = await query.range(start, end);

    if (error) {
      return err(
        appError(classifyError(error), error.message) as FetchError,
      );
    }

    return ok({
      rows: (data ?? []) as EventListRow[],
      total: count ?? 0,
    });
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({
        code: "NETWORK_ERROR",
        message: cause.message,
      });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}
