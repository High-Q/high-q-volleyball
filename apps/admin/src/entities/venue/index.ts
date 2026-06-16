/**
 * entities/venue の Public API。
 *
 * venues マスタへの軽量アクセス層。複数 widget から再利用される（events-list の
 * フィルタ dropdown / event-form の会場 select 等）ため entities 層に置く。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 */

export { useVenues, type UseVenues, type VenueOption } from "./composables/useVenues";
export { shortenVenueName } from "./lib/venueLabel";

// 会場マスタ CRUD（#151）。read 専用の useVenues とは別に、本格的な CRUD
// アクセス層を api/ に置く。将来両者の統合を検討する候補。
export {
  fetchVenues,
  fetchVenue,
  createVenue,
  updateVenue,
  deleteVenue,
  type VenueUpdate,
  type FetchError,
  type FetchErrorCode,
} from "./api/venueQueries";
