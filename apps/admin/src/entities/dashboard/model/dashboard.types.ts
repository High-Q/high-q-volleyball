import type { EventId, MemberId, ReservationId } from "@high-q/shared";

/**
 * admin Dashboard (#149) 用のドメイン型。
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 *   openspec/changes/admin-dashboard-screen/specs/data-schema/spec.md
 *   supabase/migrations/20260609000000_admin_dashboard_views.sql
 */

/** `admin_dashboard_view` の 1 行。常に 1 行返る。 */
export interface DashboardStatsRow {
  upcoming_event_count: number;
  upcoming_full_event_count: number;
  attended_this_month_count: number;
  attended_last_month_count: number;
  attended_delta_pct_vs_last_month: number | null;
  fee_total_this_month: number;
  fee_total_last_month: number;
  fee_delta_pct_vs_last_month: number | null;
  avg_fill_rate_6m: number | null;
}

/** `admin_dashboard_recent_bookings_view` の 1 行。 */
export interface DashboardRecentBookingRow {
  reservation_id: ReservationId;
  member_id: MemberId;
  member_display_name: string;
  member_initial: string;
  event_id: EventId;
  event_name: string;
  created_at: string;
  status: string;
}

/** 直近イベント 3 件用に `event_list_view` から取得する列のサブセット。 */
export interface DashboardUpcomingEventRow {
  id: EventId;
  name: string;
  start_at: string;
  end_at: string;
  venue_name: string | null;
  capacity: number | null;
  reserved_count: number;
}

/** 通知パネル「満員直前」用 (残席 1〜2)。 */
export interface DashboardNearFullEventRow {
  id: EventId;
  name: string;
  start_at: string;
  capacity: number;
  reserved_count: number;
  remaining: number;
}

/** 通知パネル「最近のキャンセル」用 (7 日窓)。 */
export interface DashboardRecentCancellationRow {
  reservation_id: ReservationId;
  member_display_name: string;
  event_name: string;
  cancelled_at: string;
}

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED";

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}
