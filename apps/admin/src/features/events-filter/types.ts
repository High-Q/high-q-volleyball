import type { Period, SortDir, SortKey } from "@/entities/event";
import type { EventVisibility, VenueId } from "@high-q/shared";

/**
 * /events のフィルタ・検索・ソート・ページの全状態。URL クエリと双方向同期される。
 *
 * 関連: openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 */
export interface FilterState {
  period: Period;
  venueId?: VenueId;
  visibility?: EventVisibility;
  search: string;
  sort: SortKey;
  dir: SortDir;
  page: number;
}

export const DEFAULT_FILTER: FilterState = {
  period: "upcoming",
  search: "",
  sort: "date",
  dir: "asc",
  page: 1,
};
