/**
 * features/dashboard-stats の Public API (#149)。
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

export { useDashboardStats } from "./composables/useDashboardStats";
export {
  toStatCardVms,
  formatDelta,
  formatCurrencyYen,
  formatPercent,
  type StatCardVm,
} from "./lib/toStatCardVm";
export { formatRelativeTime } from "./lib/formatRelativeTime";
