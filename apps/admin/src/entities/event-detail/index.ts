/**
 * entities/event-detail の Public API。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

export type { EventDetailRow } from "./model/eventDetail.types";

export {
  getEventDetail,
  type FetchError,
  type FetchErrorCode,
} from "./api/eventDetailQueries";
