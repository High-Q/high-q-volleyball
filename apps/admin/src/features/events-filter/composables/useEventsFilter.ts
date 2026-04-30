import { computed, type ComputedRef } from "vue";
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
} from "vue-router";
import type { Period, SortDir, SortKey } from "@/entities/event";
import type { EventVisibility, VenueId } from "@high-q/shared";
import { DEFAULT_FILTER, type FilterState } from "../types";

/**
 * URL クエリ ↔ フィルタ状態の双方向同期 composable。
 *
 * - フィルタ系の変更は `replace`（履歴を増やさない）
 * - ページ送りは `push`（戻れる）
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *       openspec/changes/admin-events-list-screen/design.md (D3)
 */

const VALID_PERIODS: readonly Period[] = [
  "upcoming",
  "this-month",
  "last-month",
  "past-all",
  "all",
] as const;
const VALID_SORTS: readonly SortKey[] = ["date", "status"] as const;
const VALID_DIRS: readonly SortDir[] = ["asc", "desc"] as const;
const VALID_VISIBILITIES: readonly EventVisibility[] = [
  "draft",
  "published",
  "private",
] as const;

function pickString(query: LocationQuery, key: string): string | undefined {
  const v = query[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function parseFilter(query: LocationQuery): FilterState {
  const periodRaw = pickString(query, "period");
  const period = (VALID_PERIODS as readonly string[]).includes(periodRaw ?? "")
    ? (periodRaw as Period)
    : DEFAULT_FILTER.period;

  const sortRaw = pickString(query, "sort");
  const sort = (VALID_SORTS as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as SortKey)
    : DEFAULT_FILTER.sort;

  const dirRaw = pickString(query, "dir");
  const dir = (VALID_DIRS as readonly string[]).includes(dirRaw ?? "")
    ? (dirRaw as SortDir)
    : DEFAULT_FILTER.dir;

  const visibilityRaw = pickString(query, "visibility");
  const visibility = (VALID_VISIBILITIES as readonly string[]).includes(
    visibilityRaw ?? "",
  )
    ? (visibilityRaw as EventVisibility)
    : undefined;

  const venueRaw = pickString(query, "venue");
  const venueId = venueRaw && venueRaw.length > 0 ? (venueRaw as VenueId) : undefined;

  const search = pickString(query, "q") ?? "";

  const pageRaw = Number.parseInt(pickString(query, "page") ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  return {
    period,
    venueId,
    visibility,
    search,
    sort,
    dir,
    page,
  };
}

function serialize(filter: FilterState): LocationQueryRaw {
  const q: LocationQueryRaw = {};
  if (filter.period !== DEFAULT_FILTER.period) q.period = filter.period;
  if (filter.venueId) q.venue = filter.venueId;
  if (filter.visibility) q.visibility = filter.visibility;
  if (filter.search.length > 0) q.q = filter.search;
  if (filter.sort !== DEFAULT_FILTER.sort) q.sort = filter.sort;
  if (filter.dir !== DEFAULT_FILTER.dir) q.dir = filter.dir;
  if (filter.page !== DEFAULT_FILTER.page) q.page = String(filter.page);
  return q;
}

export interface UseEventsFilter {
  filter: ComputedRef<FilterState>;
  isFiltered: ComputedRef<boolean>;
  setPeriod: (period: Period) => Promise<void>;
  setVenue: (venueId: VenueId | undefined) => Promise<void>;
  setVisibility: (visibility: EventVisibility | undefined) => Promise<void>;
  setSearch: (search: string) => Promise<void>;
  setSort: (sort: SortKey, dir: SortDir) => Promise<void>;
  setPage: (page: number) => Promise<void>;
  reset: () => Promise<void>;
}

export function useEventsFilter(): UseEventsFilter {
  const route = useRoute();
  const router = useRouter();

  const filter = computed<FilterState>(() => parseFilter(route.query));

  const isFiltered = computed<boolean>(() => {
    const f = filter.value;
    if (f.period !== DEFAULT_FILTER.period) return true;
    if (f.venueId !== undefined) return true;
    if (f.visibility !== undefined) return true;
    if (f.search.length > 0) return true;
    if (f.sort !== DEFAULT_FILTER.sort) return true;
    if (f.dir !== DEFAULT_FILTER.dir) return true;
    if (f.page !== DEFAULT_FILTER.page) return true;
    return false;
  });

  async function update(
    next: FilterState,
    mode: "replace" | "push",
  ): Promise<void> {
    const query = serialize(next);
    if (mode === "replace") {
      await router.replace({ query });
    } else {
      await router.push({ query });
    }
  }

  async function setPeriod(period: Period): Promise<void> {
    await update({ ...filter.value, period, page: 1 }, "replace");
  }

  async function setVenue(venueId: VenueId | undefined): Promise<void> {
    await update({ ...filter.value, venueId, page: 1 }, "replace");
  }

  async function setVisibility(
    visibility: EventVisibility | undefined,
  ): Promise<void> {
    await update({ ...filter.value, visibility, page: 1 }, "replace");
  }

  async function setSearch(search: string): Promise<void> {
    await update({ ...filter.value, search, page: 1 }, "replace");
  }

  async function setSort(sort: SortKey, dir: SortDir): Promise<void> {
    await update({ ...filter.value, sort, dir, page: 1 }, "replace");
  }

  async function setPage(page: number): Promise<void> {
    await update({ ...filter.value, page }, "push");
  }

  async function reset(): Promise<void> {
    await update({ ...DEFAULT_FILTER }, "replace");
  }

  return {
    filter,
    isFiltered,
    setPeriod,
    setVenue,
    setVisibility,
    setSearch,
    setSort,
    setPage,
    reset,
  };
}
