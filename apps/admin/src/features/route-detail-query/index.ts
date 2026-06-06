/**
 * features/route-detail-query — URL クエリ `?detail=<id>` を扱う汎用 composable の Public API。
 *
 * 関連:
 *   openspec/changes/link-event-participants-to-member-detail/design.md (D3)
 */

export {
  useRouteDetailQuery,
  type UseRouteDetailQuery,
} from "./composables/useRouteDetailQuery";
