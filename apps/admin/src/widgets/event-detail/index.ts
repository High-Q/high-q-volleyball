/**
 * widgets/event-detail の Public API。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

export { default as EventDetailWidget } from "./ui/EventDetailWidget.vue";
export {
  useEventDetailData,
  type UseEventDetailData,
} from "./composables/useEventDetailData";
