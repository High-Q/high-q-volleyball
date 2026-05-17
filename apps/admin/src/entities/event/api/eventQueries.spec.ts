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
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    maybeSingle: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    // delete().eq() is awaitable directly
    then: undefined,
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

// =============================================================================
// admin-events-crud-screen (#86) — getEventById / createEvent / updateEvent /
// deleteEvent
// =============================================================================

const SAMPLE_EVENT_ID = "11111111-1111-4111-8111-111111111111";
const SAMPLE_VENUE_ID = "22222222-2222-4222-8222-222222222222";
const SAMPLE_EVENT = {
  id: SAMPLE_EVENT_ID,
  name: "ゆる練 vol.43",
  description: null,
  start_at: "2026-05-12T19:30:00+09:00",
  end_at: "2026-05-12T21:30:00+09:00",
  venue_id: SAMPLE_VENUE_ID,
  fee: 1000,
  capacity: null,
  visibility: "published",
  status: "scheduled",
  cancel_deadline: null,
  created_by: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

describe("getEventById", () => {
  it("events を id で 1 件 SELECT して Event を返す", async () => {
    builderResult.data = SAMPLE_EVENT;
    const { getEventById } = await import("./eventQueries");
    const result = await getEventById(SAMPLE_EVENT_ID as never);
    expect(fromMock).toHaveBeenCalledWith("events");
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", SAMPLE_EVENT_ID);
    expect(currentBuilder.maybeSingle).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value?.id).toBe(SAMPLE_EVENT_ID);
  });

  it("行が無い場合は ok(null) を返す", async () => {
    builderResult.data = null;
    builderResult.error = null;
    const { getEventById } = await import("./eventQueries");
    const result = await getEventById(SAMPLE_EVENT_ID as never);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  it("RLS で 42501 エラーは PERMISSION_DENIED にマップ", async () => {
    builderResult.data = null;
    builderResult.error = { code: "42501", message: "permission denied" };
    const { getEventById } = await import("./eventQueries");
    const result = await getEventById(SAMPLE_EVENT_ID as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });
});

describe("createEvent", () => {
  it("INSERT ペイロードに visibility:'published' / capacity:null / description:null / cancel_deadline:null を固定投入する (D3, 即時公開ポリシー)", async () => {
    builderResult.data = SAMPLE_EVENT;
    const { createEvent } = await import("./eventQueries");
    const result = await createEvent({
      name: "ゆる練 vol.43",
      start_at: "2026-05-12T19:30:00+09:00",
      end_at: "2026-05-12T21:30:00+09:00",
      venue_id: SAMPLE_VENUE_ID as never,
      fee: 1000,
    });
    expect(fromMock).toHaveBeenCalledWith("events");
    expect(currentBuilder.insert).toHaveBeenCalledTimes(1);
    const payload = (currentBuilder.insert as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(payload.visibility).toBe("published");
    expect(payload.capacity).toBeNull();
    expect(payload.description).toBeNull();
    expect(payload.cancel_deadline).toBeNull();
    expect(payload.name).toBe("ゆる練 vol.43");
    expect(payload.fee).toBe(1000);
    expect(currentBuilder.single).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("呼び出し側が visibility を指定しても 'published' で上書きされる", async () => {
    builderResult.data = SAMPLE_EVENT;
    const { createEvent } = await import("./eventQueries");
    await createEvent({
      name: "draft で送りたい",
      start_at: "2026-05-12T19:30:00+09:00",
      end_at: "2026-05-12T21:30:00+09:00",
      venue_id: SAMPLE_VENUE_ID as never,
      // EventInsert は visibility を optional に許容するが、createEvent 内で
      // 'published' に固定上書きすることをここで検証する
      visibility: "draft",
    });
    const payload = (currentBuilder.insert as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(payload.visibility).toBe("published");
  });

  it("RLS エラーは PERMISSION_DENIED を返す", async () => {
    builderResult.data = null;
    builderResult.error = {
      code: "42501",
      message: "permission denied for table events",
    };
    const { createEvent } = await import("./eventQueries");
    const result = await createEvent({
      name: "x",
      start_at: "2026-05-12T19:30:00+09:00",
      end_at: "2026-05-12T21:30:00+09:00",
      venue_id: SAMPLE_VENUE_ID as never,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });
});

describe("updateEvent", () => {
  it("UPDATE ペイロードに visibility / capacity / description / cancel_deadline / status は含めない (既存値保護)", async () => {
    builderResult.data = SAMPLE_EVENT;
    const { updateEvent } = await import("./eventQueries");
    await updateEvent(SAMPLE_EVENT_ID as never, {
      name: "改題後",
      fee: 1500,
    });
    expect(currentBuilder.update).toHaveBeenCalledTimes(1);
    const payload = (currentBuilder.update as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect(payload.name).toBe("改題後");
    expect(payload.fee).toBe(1500);
    expect("visibility" in payload).toBe(false);
    expect("capacity" in payload).toBe(false);
    expect("description" in payload).toBe(false);
    expect("cancel_deadline" in payload).toBe(false);
    expect("status" in payload).toBe(false);
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", SAMPLE_EVENT_ID);
  });

  it("呼び出し側が unknown キーで visibility を渡しても落とす", async () => {
    builderResult.data = SAMPLE_EVENT;
    const { updateEvent } = await import("./eventQueries");
    await updateEvent(
      SAMPLE_EVENT_ID as never,
      // @ts-expect-error 攻撃的呼び出しシミュレーション
      { name: "改題", visibility: "draft", capacity: 30 },
    );
    const payload = (currentBuilder.update as ReturnType<typeof vi.fn>).mock
      .calls[0]![0];
    expect("visibility" in payload).toBe(false);
    expect("capacity" in payload).toBe(false);
  });
});

describe("deleteEvent", () => {
  it("delete().eq('id', ...) を呼ぶ", async () => {
    builderResult.data = null;
    builderResult.error = null;
    // delete() chain returns { error: null } via .eq
    currentBuilder.eq = vi.fn().mockResolvedValue({ error: null });
    const { deleteEvent } = await import("./eventQueries");
    const result = await deleteEvent(SAMPLE_EVENT_ID as never);
    expect(fromMock).toHaveBeenCalledWith("events");
    expect(currentBuilder.delete).toHaveBeenCalledTimes(1);
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", SAMPLE_EVENT_ID);
    expect(result.ok).toBe(true);
  });

  it("RLS エラーは PERMISSION_DENIED を返す", async () => {
    currentBuilder.eq = vi.fn().mockResolvedValue({
      error: { code: "42501", message: "permission denied" },
    });
    const { deleteEvent } = await import("./eventQueries");
    const result = await deleteEvent(SAMPLE_EVENT_ID as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });

  it("FK CASCADE 後は予約あり event でも 200 で削除できる (#253)", async () => {
    currentBuilder.eq = vi.fn().mockResolvedValue({ error: null });
    const { deleteEvent } = await import("./eventQueries");
    const result = await deleteEvent(SAMPLE_EVENT_ID as never);
    expect(result.ok).toBe(true);
  });
});

describe("classifyEventReservations", () => {
  it("status ごとの件数を集計して返す", async () => {
    builderResult.error = null;
    currentBuilder.eq = vi.fn().mockResolvedValue({
      data: [
        { status: "reserved" },
        { status: "reserved" },
        { status: "attended" },
        { status: "cancelled" },
        { status: "no_show" },
        { status: "waitlist" },
      ],
      error: null,
    });
    const { classifyEventReservations } = await import("./eventQueries");
    const result = await classifyEventReservations(SAMPLE_EVENT_ID as never);
    expect(fromMock).toHaveBeenCalledWith("reservations");
    expect(currentBuilder.select).toHaveBeenCalledWith("status");
    expect(currentBuilder.eq).toHaveBeenCalledWith("event_id", SAMPLE_EVENT_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        reserved: 2,
        attended: 1,
        cancelled: 1,
        no_show: 1,
        waitlist: 1,
      });
    }
  });

  it("予約 0 件のイベントは全て 0 を返す", async () => {
    currentBuilder.eq = vi.fn().mockResolvedValue({ data: [], error: null });
    const { classifyEventReservations } = await import("./eventQueries");
    const result = await classifyEventReservations(SAMPLE_EVENT_ID as never);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        reserved: 0,
        attended: 0,
        cancelled: 0,
        no_show: 0,
        waitlist: 0,
      });
    }
  });

  it("RLS エラーは PERMISSION_DENIED を返す", async () => {
    currentBuilder.eq = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    const { classifyEventReservations } = await import("./eventQueries");
    const result = await classifyEventReservations(SAMPLE_EVENT_ID as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });
});
