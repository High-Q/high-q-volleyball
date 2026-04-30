import { beforeEach, describe, expect, it, vi } from "vitest";

const builderResult = {
  data: null as unknown,
  error: null as unknown,
  count: 0 as number | null,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockImplementation(async () => ({ ...builderResult })),
  };
  return builder;
}

let currentBuilder = makeBuilder();
const fromMock = vi.fn();

const supabaseClient = {
  from: fromMock,
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseClient,
  _resetSupabaseForTest: () => {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  currentBuilder = makeBuilder();
  fromMock.mockReturnValue(currentBuilder);
  builderResult.data = [];
  builderResult.error = null;
  builderResult.count = 0;
});

describe("fetchEventsList", () => {
  it("event_list_view を SELECT する", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "upcoming",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(fromMock).toHaveBeenCalledWith("event_list_view");
    expect(currentBuilder.select).toHaveBeenCalledWith("*", {
      count: "exact",
    });
  });

  it("page=1 / per=25 のとき range(0, 24) を呼ぶ", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "upcoming",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.range).toHaveBeenCalledWith(0, 24);
  });

  it("page=2 / per=25 のとき range(25, 49) を呼ぶ", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "upcoming",
      search: "",
      sort: "date",
      dir: "asc",
      page: 2,
      per: 25,
    });
    expect(currentBuilder.range).toHaveBeenCalledWith(25, 49);
  });

  it("period='upcoming' のとき start_at >= now の gte 条件が付く", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "upcoming",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.gte).toHaveBeenCalledWith(
      "start_at",
      expect.any(String),
    );
  });

  it("period='past-all' のとき end_at < now の lt 条件が付く", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "past-all",
      search: "",
      sort: "date",
      dir: "desc",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.lt).toHaveBeenCalledWith(
      "end_at",
      expect.any(String),
    );
  });

  it("period='all' のとき期間条件が付かない", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "all",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.gte).not.toHaveBeenCalled();
    expect(currentBuilder.lt).not.toHaveBeenCalled();
  });

  it("venueId 指定で eq('venue_id', ...) が呼ばれる", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "all",
      venueId: "22222222-2222-4222-8222-222222222222" as never,
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.eq).toHaveBeenCalledWith(
      "venue_id",
      "22222222-2222-4222-8222-222222222222",
    );
  });

  it("visibility 指定で eq('visibility', ...) が呼ばれる", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "all",
      visibility: "published",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.eq).toHaveBeenCalledWith("visibility", "published");
  });

  it("search 指定で or(name.ilike, venue_name.ilike) が呼ばれる", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "all",
      search: "ゆる練",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.or).toHaveBeenCalledWith(
      "name.ilike.%ゆる練%,venue_name.ilike.%ゆる練%",
    );
  });

  it("sort='date' / dir='asc' で order('start_at', { ascending: true }) を呼ぶ", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "all",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.order).toHaveBeenCalledWith("start_at", {
      ascending: true,
    });
  });

  it("sort='status' / dir='desc' で order('visibility', { ascending: false }) を呼ぶ", async () => {
    const { fetchEventsList } = await import("./eventQueries");
    await fetchEventsList({
      period: "all",
      search: "",
      sort: "status",
      dir: "desc",
      page: 1,
      per: 25,
    });
    expect(currentBuilder.order).toHaveBeenCalledWith("visibility", {
      ascending: false,
    });
  });

  it("成功時は Ok({ rows, total }) を返す", async () => {
    builderResult.data = [{ id: "x" }];
    builderResult.count = 42;
    const { fetchEventsList } = await import("./eventQueries");
    const result = await fetchEventsList({
      period: "all",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rows).toEqual([{ id: "x" }]);
      expect(result.value.total).toBe(42);
    }
  });

  it("空配列でも Ok({ rows: [], total: 0 }) を返す", async () => {
    builderResult.data = [];
    builderResult.count = 0;
    const { fetchEventsList } = await import("./eventQueries");
    const result = await fetchEventsList({
      period: "all",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rows).toEqual([]);
      expect(result.value.total).toBe(0);
    }
  });

  it("network 例外で NETWORK_ERROR を返す", async () => {
    currentBuilder.range = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const { fetchEventsList } = await import("./eventQueries");
    const result = await fetchEventsList({
      period: "all",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("Supabase が permission denied を返したら PERMISSION_DENIED を返す", async () => {
    builderResult.data = null;
    builderResult.error = {
      code: "42501",
      message: "permission denied for view event_list_view",
    };
    const { fetchEventsList } = await import("./eventQueries");
    const result = await fetchEventsList({
      period: "all",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PERMISSION_DENIED");
    }
  });

  it("その他のエラーは SERVER_ERROR を返す", async () => {
    builderResult.data = null;
    builderResult.error = { code: "PGRST000", message: "internal" };
    const { fetchEventsList } = await import("./eventQueries");
    const result = await fetchEventsList({
      period: "all",
      search: "",
      sort: "date",
      dir: "asc",
      page: 1,
      per: 25,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SERVER_ERROR");
    }
  });
});
