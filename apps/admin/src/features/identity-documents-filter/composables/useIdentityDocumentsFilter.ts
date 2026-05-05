import { computed, type ComputedRef } from "vue";
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
} from "vue-router";
import type { StatusFilter } from "@/entities/identity-document";
import { DEFAULT_FILTER, type FilterState } from "../types";

/**
 * URL クエリ ↔ フィルタ状態の双方向同期 composable (#171 admin-identity-document-review)。
 *
 * - status 変更 / 検索 / リセットは `replace` (履歴を増やさない)
 * - ページ送りは `push` (戻れる)
 * - status は **常に URL に書き込む** (デフォルト pending でも明示性確保、design D3)
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D3)
 */

const VALID_STATUSES: readonly StatusFilter[] = [
  "pending",
  "approved",
  "rejected",
  "all",
] as const;

function pickString(query: LocationQuery, key: string): string | undefined {
  const v = query[key];
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return undefined;
}

function parseFilter(query: LocationQuery): FilterState {
  const statusRaw = pickString(query, "status");
  const status = (VALID_STATUSES as readonly string[]).includes(
    statusRaw ?? "",
  )
    ? (statusRaw as StatusFilter)
    : DEFAULT_FILTER.status;

  const search = pickString(query, "q") ?? "";

  const pageRaw = Number.parseInt(pickString(query, "page") ?? "", 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  return {
    status,
    search,
    page,
  };
}

function serialize(filter: FilterState): LocationQueryRaw {
  const q: LocationQueryRaw = {};
  // status は常に URL に明示する (design D3 — pending でも保持)
  q.status = filter.status;
  if (filter.search.length > 0) q.q = filter.search;
  if (filter.page !== DEFAULT_FILTER.page) q.page = String(filter.page);
  return q;
}

export interface UseIdentityDocumentsFilter {
  filter: ComputedRef<FilterState>;
  isDefault: ComputedRef<boolean>;
  setStatus: (status: StatusFilter) => Promise<void>;
  setSearch: (search: string) => Promise<void>;
  setPage: (page: number) => Promise<void>;
  reset: () => Promise<void>;
  /** URL に status が未指定の場合、デフォルト pending を URL に補完する。
   *  widget 側 onMounted で 1 回呼ぶ想定 (design D3)。 */
  ensureDefaultUrl: () => Promise<void>;
}

export function useIdentityDocumentsFilter(): UseIdentityDocumentsFilter {
  const route = useRoute();
  const router = useRouter();

  const filter = computed<FilterState>(() => parseFilter(route.query));

  const isDefault = computed<boolean>(() => {
    const f = filter.value;
    return (
      f.status === DEFAULT_FILTER.status &&
      f.search === DEFAULT_FILTER.search &&
      f.page === DEFAULT_FILTER.page
    );
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

  async function setStatus(status: StatusFilter): Promise<void> {
    await update({ ...filter.value, status, page: 1 }, "replace");
  }

  async function setSearch(search: string): Promise<void> {
    await update({ ...filter.value, search, page: 1 }, "replace");
  }

  async function setPage(page: number): Promise<void> {
    await update({ ...filter.value, page }, "push");
  }

  async function reset(): Promise<void> {
    await update({ ...DEFAULT_FILTER }, "replace");
  }

  async function ensureDefaultUrl(): Promise<void> {
    if (route.query.status === undefined) {
      await update({ ...filter.value }, "replace");
    }
  }

  return {
    filter,
    isDefault,
    setStatus,
    setSearch,
    setPage,
    reset,
    ensureDefaultUrl,
  };
}
