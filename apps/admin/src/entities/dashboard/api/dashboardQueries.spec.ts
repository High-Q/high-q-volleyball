import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * dashboardQueries の URL / select / order / limit 契約を検証する spec (#149)。
 * Supabase client を mock し、各 fetcher が仕様どおり view / table を叩くことを担保する。
 */

const result = {
  data: null as unknown,
  error: null as unknown,
};

interface MockBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => unknown;
}

function makeBuilder(): MockBuilder {
  const builder = {} as MockBuilder;
  const chain = () => vi.fn().mockImplementation(() => builder);
  builder.select = chain();
  builder.eq = chain();
  builder.neq = chain();
  builder.gt = chain();
  builder.not = chain();
  builder.order = chain();
  builder.limit = chain();
  builder.maybeSingle = vi.fn().mockImplementation(async () => ({
    data: result.data,
    error: result.error,
  }));
  // builder 自体を thenable にする (Supabase の PostgrestBuilder は PromiseLike)
  builder.then = (resolve) =>
    resolve({ data: result.data, error: result.error });
  return builder;
}

let currentBuilder = makeBuilder();
const fromMock = vi.fn();
const supabaseClient = { from: fromMock };

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  currentBuilder = makeBuilder();
  fromMock.mockReturnValue(currentBuilder);
  result.data = null;
  result.error = null;
});

describe("getDashboardStats", () => {
  it("admin_dashboard_view を maybeSingle で取得する", async () => {
    result.data = {
      upcoming_event_count: 1,
      upcoming_full_event_count: 0,
      attended_this_month_count: 0,
      attended_last_month_count: 9,
      attended_delta_pct_vs_last_month: -1,
      fee_total_this_month: 0,
      fee_total_last_month: 6000,
      fee_delta_pct_vs_last_month: -1,
      avg_fill_rate_6m: null,
    };
    const { getDashboardStats } = await import("./dashboardQueries");

    const r = await getDashboardStats();

    expect(fromMock).toHaveBeenCalledWith("admin_dashboard_view");
    expect(currentBuilder.select).toHaveBeenCalledWith("*");
    expect(currentBuilder.maybeSingle).toHaveBeenCalled();
    expect(r.ok).toBe(true);
  });

  it("0 行のとき SERVER_ERROR を返す", async () => {
    result.data = null;
    const { getDashboardStats } = await import("./dashboardQueries");

    const r = await getDashboardStats();

    expect(r.ok).toBe(false);
  });
});

describe("getDashboardRecentBookings", () => {
  it("admin_dashboard_recent_bookings_view を created_at desc で 4 件取得", async () => {
    result.data = [];
    const { getDashboardRecentBookings } = await import("./dashboardQueries");

    await getDashboardRecentBookings();

    expect(fromMock).toHaveBeenCalledWith("admin_dashboard_recent_bookings_view");
    expect(currentBuilder.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(currentBuilder.limit).toHaveBeenCalledWith(4);
  });
});

describe("getDashboardUpcomingEvents", () => {
  it("event_list_view を start_at asc で 3 件、published + 未来 + 非 cancelled", async () => {
    result.data = [];
    const { getDashboardUpcomingEvents } = await import("./dashboardQueries");

    await getDashboardUpcomingEvents();

    expect(fromMock).toHaveBeenCalledWith("event_list_view");
    expect(currentBuilder.gt).toHaveBeenCalledWith(
      "start_at",
      expect.any(String),
    );
    expect(currentBuilder.eq).toHaveBeenCalledWith("visibility", "published");
    expect(currentBuilder.neq).toHaveBeenCalledWith("status", "cancelled");
    expect(currentBuilder.order).toHaveBeenCalledWith("start_at", {
      ascending: true,
    });
    expect(currentBuilder.limit).toHaveBeenCalledWith(3);
  });
});

describe("getDashboardNearFullEvents", () => {
  it("クライアント側で 残席 1〜2 を絞り込み、上位 3 件を返す", async () => {
    result.data = [
      { id: "e1", name: "A", start_at: "x", capacity: 18, reserved_count: 17 }, // 残 1
      { id: "e2", name: "B", start_at: "x", capacity: 18, reserved_count: 16 }, // 残 2
      { id: "e3", name: "C", start_at: "x", capacity: 18, reserved_count: 15 }, // 残 3 → 除外
      { id: "e4", name: "D", start_at: "x", capacity: 18, reserved_count: 18 }, // 残 0 → 除外
      { id: "e5", name: "E", start_at: "x", capacity: 10, reserved_count: 9 },  // 残 1
      { id: "e6", name: "F", start_at: "x", capacity: 10, reserved_count: 8 },  // 残 2 → 4 件目で slice 落ち
    ];
    const { getDashboardNearFullEvents } = await import("./dashboardQueries");

    const r = await getDashboardNearFullEvents();

    expect(fromMock).toHaveBeenCalledWith("event_list_view");
    expect(currentBuilder.not).toHaveBeenCalledWith("capacity", "is", null);
    expect(currentBuilder.order).toHaveBeenCalledWith("start_at", {
      ascending: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(3);
      expect(r.value.map((row) => row.id)).toEqual(["e1", "e2", "e5"]);
      expect(r.value[0]?.remaining).toBe(1);
    }
  });
});

describe("getDashboardRecentCancellations", () => {
  it("reservations を cancelled + 7 日窓で 3 件、member/event embed", async () => {
    result.data = [
      {
        id: "r1",
        cancelled_at: "2026-06-10T00:00:00Z",
        member: {
          last_name: "田中",
          first_name: "美咲",
          nickname: null,
          display_name: "田中 美咲",
        },
        event: { name: "ゆる練 vol.42" },
      },
    ];
    const { getDashboardRecentCancellations } = await import(
      "./dashboardQueries"
    );

    const r = await getDashboardRecentCancellations();

    expect(fromMock).toHaveBeenCalledWith("reservations");
    expect(currentBuilder.eq).toHaveBeenCalledWith("status", "cancelled");
    expect(currentBuilder.gt).toHaveBeenCalledWith(
      "cancelled_at",
      expect.any(String),
    );
    expect(currentBuilder.not).toHaveBeenCalledWith("member_id", "is", null);
    expect(currentBuilder.order).toHaveBeenCalledWith("cancelled_at", {
      ascending: false,
    });
    expect(currentBuilder.limit).toHaveBeenCalledWith(3);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]?.member_display_name).toBe("田中 美咲");
      expect(r.value[0]?.event_name).toBe("ゆる練 vol.42");
    }
  });

  it("氏名が null の場合は nickname にフォールバック", async () => {
    result.data = [
      {
        id: "r2",
        cancelled_at: "2026-06-10T00:00:00Z",
        member: {
          last_name: null,
          first_name: null,
          nickname: "美咲",
          display_name: "美咲",
        },
        event: { name: "ゆる練" },
      },
    ];
    const { getDashboardRecentCancellations } = await import(
      "./dashboardQueries"
    );

    const r = await getDashboardRecentCancellations();

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]?.member_display_name).toBe("美咲");
    }
  });
});
