import { computed, type ComputedRef } from "vue";
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
} from "vue-router";
import type {
  AttendedRange,
  ExperienceFilter,
  LastPeriod,
  MembersListSortKey,
} from "@/entities/member";
import {
  DEFAULT_FILTER,
  type MembersFilterState,
  type SortDir,
} from "../types";

/**
 * URL クエリ ↔ /members フィルタ状態の双方向同期 composable。
 *
 * - フィルタ系の変更は `replace`（履歴を増やさない）
 * - ページ送りと詳細 sheet 開閉は `push`（戻れる）
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *   openspec/changes/admin-members-list-screen/design.md (D6, D9)
 */

const VALID_EXP: readonly ExperienceFilter[] = [
  "beginner",
  "intermediate",
  "experienced",
] as const;
const VALID_RANGE: readonly AttendedRange[] = [
  "first",
  "2-5",
  "6-10",
  "11+",
] as const;
const VALID_PERIOD: readonly LastPeriod[] = ["this-month", "3m", "6m+"] as const;
const VALID_SORT: readonly MembersListSortKey[] = [
  "last_attended_at",
  "attended_count",
  "first_attended_at",
  "display_name",
] as const;
const VALID_DIR: readonly SortDir[] = ["asc", "desc"] as const;

function pickString(query: LocationQuery, key: string): string | undefined {
  const v = query[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function parseFilter(query: LocationQuery): MembersFilterState {
  const expRaw = pickString(query, "exp");
  const exp = (VALID_EXP as readonly string[]).includes(expRaw ?? "")
    ? (expRaw as ExperienceFilter)
    : undefined;

  const rangeRaw = pickString(query, "attended");
  const attendedRange = (VALID_RANGE as readonly string[]).includes(
    rangeRaw ?? "",
  )
    ? (rangeRaw as AttendedRange)
    : undefined;

  const lastRaw = pickString(query, "last");
  const lastPeriod = (VALID_PERIOD as readonly string[]).includes(lastRaw ?? "")
    ? (lastRaw as LastPeriod)
    : undefined;

  const search = pickString(query, "q") ?? "";

  const sortRaw = pickString(query, "sort");
  const sort = (VALID_SORT as readonly string[]).includes(sortRaw ?? "")
    ? (sortRaw as MembersListSortKey)
    : DEFAULT_FILTER.sort;

  const dirRaw = pickString(query, "dir");
  const dir = (VALID_DIR as readonly string[]).includes(dirRaw ?? "")
    ? (dirRaw as SortDir)
    : DEFAULT_FILTER.dir;

  const pageRaw = Number.parseInt(pickString(query, "page") ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const detail = pickString(query, "detail");

  return {
    exp,
    attendedRange,
    lastPeriod,
    search,
    sort,
    dir,
    page,
    detail: detail && detail.length > 0 ? detail : undefined,
  };
}

function serialize(filter: MembersFilterState): LocationQueryRaw {
  const q: LocationQueryRaw = {};
  if (filter.exp) q.exp = filter.exp;
  if (filter.attendedRange) q.attended = filter.attendedRange;
  if (filter.lastPeriod) q.last = filter.lastPeriod;
  if (filter.search.length > 0) q.q = filter.search;
  if (filter.sort !== DEFAULT_FILTER.sort) q.sort = filter.sort;
  if (filter.dir !== DEFAULT_FILTER.dir) q.dir = filter.dir;
  if (filter.page !== DEFAULT_FILTER.page) q.page = String(filter.page);
  if (filter.detail) q.detail = filter.detail;
  return q;
}

export interface UseMembersFilter {
  filter: ComputedRef<MembersFilterState>;
  isFiltered: ComputedRef<boolean>;
  setExp: (v: ExperienceFilter | undefined) => Promise<void>;
  setAttendedRange: (v: AttendedRange | undefined) => Promise<void>;
  setLastPeriod: (v: LastPeriod | undefined) => Promise<void>;
  setSearch: (v: string) => Promise<void>;
  setSort: (sort: MembersListSortKey, dir: SortDir) => Promise<void>;
  setPage: (page: number) => Promise<void>;
  openDetail: (memberId: string) => Promise<void>;
  closeDetail: () => Promise<void>;
  reset: () => Promise<void>;
}

export function useMembersFilter(): UseMembersFilter {
  const route = useRoute();
  const router = useRouter();

  const filter = computed<MembersFilterState>(() => parseFilter(route.query));

  const isFiltered = computed<boolean>(() => {
    const f = filter.value;
    if (f.exp !== undefined) return true;
    if (f.attendedRange !== undefined) return true;
    if (f.lastPeriod !== undefined) return true;
    if (f.search.length > 0) return true;
    if (f.sort !== DEFAULT_FILTER.sort) return true;
    if (f.dir !== DEFAULT_FILTER.dir) return true;
    if (f.page !== DEFAULT_FILTER.page) return true;
    return false;
  });

  async function update(
    next: MembersFilterState,
    mode: "replace" | "push",
  ): Promise<void> {
    const query = serialize(next);
    if (mode === "replace") {
      await router.replace({ query });
    } else {
      await router.push({ query });
    }
  }

  async function setExp(v: ExperienceFilter | undefined): Promise<void> {
    await update({ ...filter.value, exp: v, page: 1 }, "replace");
  }

  async function setAttendedRange(v: AttendedRange | undefined): Promise<void> {
    await update({ ...filter.value, attendedRange: v, page: 1 }, "replace");
  }

  async function setLastPeriod(v: LastPeriod | undefined): Promise<void> {
    await update({ ...filter.value, lastPeriod: v, page: 1 }, "replace");
  }

  async function setSearch(v: string): Promise<void> {
    await update({ ...filter.value, search: v, page: 1 }, "replace");
  }

  async function setSort(
    sort: MembersListSortKey,
    dir: SortDir,
  ): Promise<void> {
    await update({ ...filter.value, sort, dir, page: 1 }, "replace");
  }

  async function setPage(page: number): Promise<void> {
    await update({ ...filter.value, page }, "push");
  }

  async function openDetail(memberId: string): Promise<void> {
    await update({ ...filter.value, detail: memberId }, "push");
  }

  async function closeDetail(): Promise<void> {
    await update({ ...filter.value, detail: undefined }, "push");
  }

  async function reset(): Promise<void> {
    await update({ ...DEFAULT_FILTER }, "replace");
  }

  return {
    filter,
    isFiltered,
    setExp,
    setAttendedRange,
    setLastPeriod,
    setSearch,
    setSort,
    setPage,
    openDetail,
    closeDetail,
    reset,
  };
}
