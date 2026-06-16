/**
 * widgets/venues-master-detail の Public API。
 *
 * 関連:
 *   openspec/changes/admin-venues-crud-screen/specs/admin-venues-crud/spec.md
 */

export { default as VenuesMasterDetail } from "./ui/VenuesMasterDetail.vue";
export { useVenuesMaster, NEW_ID, type UseVenuesMaster } from "./composables/useVenuesMaster";
