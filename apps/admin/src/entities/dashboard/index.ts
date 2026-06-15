/**
 * entities/dashboard の Public API (#149)。
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 */

export type {
  DashboardStatsRow,
  DashboardRecentBookingRow,
  DashboardUpcomingEventRow,
  DashboardNearFullEventRow,
  DashboardRecentCancellationRow,
  FetchError,
  FetchErrorCode,
} from "./model/dashboard.types";

export {
  getDashboardStats,
  getDashboardRecentBookings,
  getDashboardUpcomingEvents,
  getDashboardNearFullEvents,
  getDashboardRecentCancellations,
} from "./api/dashboardQueries";
