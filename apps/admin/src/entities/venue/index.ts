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
