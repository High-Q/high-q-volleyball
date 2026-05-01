/**
 * entities/reservation の Public API。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

export type { ParticipantRow } from "./model/reservation.types";

export {
  getEventParticipants,
  type FetchError as ParticipantFetchError,
  type FetchErrorCode as ParticipantFetchErrorCode,
} from "./api/reservationQueries";

export {
  toggleCheckin,
  cancelByAdmin,
  type MutationError as ReservationMutationError,
  type MutationErrorCode as ReservationMutationErrorCode,
} from "./api/reservationMutations";
