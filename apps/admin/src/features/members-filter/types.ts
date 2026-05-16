import type {
  AttendedRange,
  ExperienceFilter,
  LastPeriod,
  MembersListSortKey,
} from "@/entities/member";

/**
 * /members のフィルタ・検索・ソート・ページ・詳細 sheet の全状態。
 * URL クエリと双方向同期される。
 *
 * 関連: openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *       openspec/changes/admin-members-list-screen/design.md (D9)
 */
export type SortDir = "asc" | "desc";

export interface MembersFilterState {
  exp?: ExperienceFilter;
  attendedRange?: AttendedRange;
  lastPeriod?: LastPeriod;
  search: string;
  sort: MembersListSortKey;
  dir: SortDir;
  page: number;
  /** 詳細 sheet の対象 member id (`?detail=` クエリ)。 */
  detail?: string;
}

export const DEFAULT_FILTER: MembersFilterState = {
  search: "",
  sort: "last_attended_at",
  dir: "desc",
  page: 1,
};
