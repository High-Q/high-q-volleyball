import { type Result, ok, err } from "@high-q/shared";
import type { EventId, ReservationId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  DashboardStatsRow,
  DashboardRecentBookingRow,
  DashboardUpcomingEventRow,
  DashboardNearFullEventRow,
  DashboardRecentCancellationRow,
  FetchError,
  FetchErrorCode,
} from "../model/dashboard.types";

/**
 * Dashboard 画面 (#149) 用の fetcher 群。
 *
 * 取得方針:
 *   - 集計値は `admin_dashboard_view` を単一クエリで取得 (N+1 / 整合性ズレ回避)
 *   - 最近の予約は `admin_dashboard_recent_bookings_view` で view 内除外を信頼
 *   - 直近イベント / 満員直前は既存 `event_list_view` の再利用
 *   - 最近のキャンセルは reservations を 7 日窓で member/event embed
 *
 * 関連:
 *   openspec/changes/admin-dashboard-screen/specs/admin-dashboard/spec.md
 *   openspec/changes/admin-dashboard-screen/design.md (D1, D2, D3, D4)
 */

function classifyError(error: { code?: string; message: string }): FetchErrorCode {
  if (error.code === "42501" || /permission/i.test(error.message)) {
    return "PERMISSION_DENIED";
  }
  return "SERVER_ERROR";
}

function toFetchError(cause: unknown): FetchError {
  if (cause instanceof TypeError) {
    return { code: "NETWORK_ERROR", message: cause.message };
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return { code: "SERVER_ERROR", message };
}

/** admin_dashboard_view から 1 行取得 (集計値)。 */
export async function getDashboardStats(): Promise<
  Result<DashboardStatsRow, FetchError>
> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("admin_dashboard_view")
      .select("*")
      .maybeSingle();

    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    if (data === null) {
      return err({ code: "SERVER_ERROR", message: "admin_dashboard_view returned no row" });
    }
    return ok(data as DashboardStatsRow);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/** 最近の予約 (LIMIT 4) を created_at desc で取得。 */
export async function getDashboardRecentBookings(): Promise<
  Result<DashboardRecentBookingRow[], FetchError>
> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("admin_dashboard_recent_bookings_view")
      .select(
        "reservation_id, member_id, member_display_name, member_initial, event_id, event_name, created_at, status",
      )
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok((data ?? []) as DashboardRecentBookingRow[]);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/** 直近イベント 3 件 (event_list_view, 開催予定 published のみ)。 */
export async function getDashboardUpcomingEvents(): Promise<
  Result<DashboardUpcomingEventRow[], FetchError>
> {
  const supabase = getSupabase();
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("event_list_view")
      .select("id, name, start_at, end_at, venue_name, capacity, reserved_count")
      .gt("start_at", nowIso)
      .eq("visibility", "published")
      .neq("status", "cancelled")
      .order("start_at", { ascending: true })
      .limit(3);

    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok((data ?? []) as DashboardUpcomingEventRow[]);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * 満員直前イベント (残席 1〜2)。event_list_view を取得した上で
 * クライアント側で「capacity - reserved_count」を計算して filter する。
 * Supabase の filter で SQL 式 (= 計算列) は使えないため、capacity の最小
 * しきい値で絞ってからクライアント側で再 filter する。
 */
export async function getDashboardNearFullEvents(): Promise<
  Result<DashboardNearFullEventRow[], FetchError>
> {
  const supabase = getSupabase();
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("event_list_view")
      .select("id, name, start_at, capacity, reserved_count")
      .gt("start_at", nowIso)
      .not("capacity", "is", null)
      .eq("visibility", "published")
      .neq("status", "cancelled")
      .order("start_at", { ascending: true });

    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }

    const rows = (data ?? []) as Array<{
      id: EventId;
      name: string;
      start_at: string;
      capacity: number;
      reserved_count: number;
    }>;

    const nearFull: DashboardNearFullEventRow[] = rows
      .map((r) => ({ ...r, remaining: r.capacity - r.reserved_count }))
      .filter((r) => r.remaining >= 1 && r.remaining <= 2)
      .slice(0, 3);

    return ok(nearFull);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/** 最近のキャンセル (7 日窓)。reservations + members + events を embed。 */
export async function getDashboardRecentCancellations(): Promise<
  Result<DashboardRecentCancellationRow[], FetchError>
> {
  const supabase = getSupabase();
  try {
    const sevenDaysAgoIso = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await supabase
      .from("reservations")
      .select(
        "id, cancelled_at, member:members(last_name, first_name, nickname, display_name), event:events(name)",
      )
      .eq("status", "cancelled")
      .gt("cancelled_at", sevenDaysAgoIso)
      .not("member_id", "is", null)
      .order("cancelled_at", { ascending: false })
      .limit(3);

    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }

    type RawRow = {
      id: string;
      cancelled_at: string;
      member: {
        last_name: string | null;
        first_name: string | null;
        nickname: string | null;
        display_name: string | null;
      } | null;
      event: { name: string } | null;
    };

    const rows = (data ?? []) as unknown as RawRow[];
    const mapped: DashboardRecentCancellationRow[] = rows.map((r) => ({
      reservation_id: r.id as unknown as ReservationId,
      member_display_name: composeMemberDisplayName(r.member),
      event_name: r.event?.name ?? "",
      cancelled_at: r.cancelled_at,
    }));
    return ok(mapped);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

function composeMemberDisplayName(
  m: {
    last_name: string | null;
    first_name: string | null;
    nickname: string | null;
    display_name: string | null;
  } | null,
): string {
  if (m === null) return "";
  const composed = [m.last_name, m.first_name]
    .filter((s) => s !== null && s !== "")
    .join(" ")
    .trim();
  if (composed.length > 0) return composed;
  if (m.nickname !== null && m.nickname !== "") return m.nickname;
  return m.display_name ?? "";
}
