import type { EventId, VenueId } from "@high-q/shared";
import type { EventStatus, EventVisibility } from "@high-q/shared";

/**
 * apps/admin の events 一覧画面が扱うドメイン型。
 *
 * 関連:
 *   openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *   openspec/changes/admin-events-list-screen/specs/data-schema/spec.md
 *   openspec/changes/admin-events-list-screen/design.md (§5)
 */

/** `event_list_view` の row DTO。snake_case で view 列と 1:1 対応。 */
export interface EventListRow {
  id: EventId;
  name: string;
  description: string | null;
  start_at: string; // ISO 8601
  end_at: string;
  venue_id: VenueId;
  venue_name: string | null;
  fee: number | null;
  capacity: number | null;
  visibility: EventVisibility;
  status: EventStatus;
  cancel_deadline: string | null;
  /**
   * 予約済みの本人 + 同伴を含む人数 (reserved + attended を母集団とする)。
   * event_detail_view / event_availability_view の reserved_count と同一集計。
   */
  reserved_count: number;
  created_at: string;
  updated_at: string;
}

/** Badge 表示用に解決済みのステータス。`status` と `visibility` を束ねた表示状態。 */
export type DisplayStatus =
  | "published"
  | "draft"
  | "private"
  | "cancelled"
  | "closed";

/** 期間フィルタ。デフォルトは upcoming。 */
export type Period =
  | "upcoming"
  | "this-month"
  | "last-month"
  | "past-all"
  | "all";

/** ソート可能な列。 */
export type SortKey = "date" | "status";

/** ソート方向。 */
export type SortDir = "asc" | "desc";
