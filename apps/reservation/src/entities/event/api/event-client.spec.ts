import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Chain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  then: (resolve: (v: unknown) => unknown) => Promise<unknown>;
};

type FromTable = "events" | "event_availability_view";

type Plan = {
  events?: { data: unknown[] | null; error: unknown };
  availability?: { data: unknown[] | null; error: unknown };
  eventDetail?: { data: unknown | null; error: unknown };
  availabilityOne?: { data: unknown | null; error: unknown };
};

let plan: Plan = {};

function makeChain(table: FromTable): Chain {
  const settle = () => {
    if (table === "events") {
      // Detail uses maybeSingle which short-circuits via maybeSingle method
      return plan.events ?? { data: null, error: null };
    }
    return plan.availability ?? { data: [], error: null };
  };
  const chain: Chain = {
    select: vi.fn().mockReturnThis() as Chain["select"],
    eq: vi.fn().mockReturnThis() as Chain["eq"],
    in: vi.fn().mockReturnThis() as Chain["in"],
    gte: vi.fn().mockReturnThis() as Chain["gte"],
    order: vi.fn().mockImplementation(() => Promise.resolve(settle())) as Chain["order"],
    maybeSingle: vi.fn().mockImplementation(() => {
      if (table === "events") {
        return Promise.resolve(plan.eventDetail ?? { data: null, error: null });
      }
      return Promise.resolve(plan.availabilityOne ?? { data: null, error: null });
    }) as Chain["maybeSingle"],
    then: (resolve) => Promise.resolve(settle()).then(resolve),
  };
  return chain;
}

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({
    from: (table: FromTable) => makeChain(table),
  }),
}));

beforeEach(() => {
  plan = {};
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const EV_ID = "11111111-1111-1111-1111-111111111111";
const VENUE_ID = "22222222-2222-2222-2222-222222222222";

const baseEventRow = {
  id: EV_ID,
  name: "ゆる練 vol.43",
  start_at: "2026-05-12T10:30:00Z",
  end_at: "2026-05-12T12:30:00Z",
  venue_id: VENUE_ID,
  fee: 1000,
  status: "scheduled",
  visibility: "published",
  venues: {
    name: "亀戸スポーツセンター",
    meeting_point: "1F ロビー",
    default_fee: 1000,
    map_url: null,
  },
};

describe("fetchUpcomingEvents", () => {
  it("availability を取得して各 EventListItem に merge する", async () => {
    plan.events = { data: [baseEventRow], error: null };
    plan.availability = {
      data: [{ event_id: EV_ID, capacity: null, reserved_count: 11 }],
      error: null,
    };
    const { fetchUpcomingEvents } = await import("./event-client");
    const events = await fetchUpcomingEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.availability).toEqual({
      eventId: EV_ID,
      capacity: null,
      reservedCount: 11,
    });
  });

  it("availability が空の event は availability=null になる", async () => {
    plan.events = { data: [baseEventRow], error: null };
    plan.availability = { data: [], error: null };
    const { fetchUpcomingEvents } = await import("./event-client");
    const events = await fetchUpcomingEvents();
    expect(events[0]?.availability).toBeNull();
  });

  it("availability 取得失敗 (error) でも events は返り、availability=null", async () => {
    plan.events = { data: [baseEventRow], error: null };
    plan.availability = { data: null, error: { message: "boom" } };
    const { fetchUpcomingEvents } = await import("./event-client");
    const events = await fetchUpcomingEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.availability).toBeNull();
    expect(events[0]?.name).toBe("ゆる練 vol.43");
  });

  it("events が空のとき availability クエリは発行しない", async () => {
    plan.events = { data: [], error: null };
    const { fetchUpcomingEvents } = await import("./event-client");
    const events = await fetchUpcomingEvents();
    expect(events).toEqual([]);
  });

  it("events 取得が error なら throw する", async () => {
    plan.events = { data: null, error: { message: "db down" } };
    const { fetchUpcomingEvents } = await import("./event-client");
    await expect(fetchUpcomingEvents()).rejects.toBeDefined();
  });
});

describe("fetchEventDetail", () => {
  it("availability を取得して EventDetail に merge する", async () => {
    plan.eventDetail = { data: baseEventRow, error: null };
    plan.availabilityOne = {
      data: { event_id: EV_ID, capacity: 18, reserved_count: 7 },
      error: null,
    };
    const { fetchEventDetail } = await import("./event-client");
    const ev = await fetchEventDetail(EV_ID);
    expect(ev).not.toBeNull();
    expect(ev?.availability).toEqual({
      eventId: EV_ID,
      capacity: 18,
      reservedCount: 7,
    });
    expect(ev?.meetingPoint).toBe("1F ロビー");
  });

  it("availability 取得失敗でも EventDetail は返り、availability=null", async () => {
    plan.eventDetail = { data: baseEventRow, error: null };
    plan.availabilityOne = { data: null, error: { message: "view down" } };
    const { fetchEventDetail } = await import("./event-client");
    const ev = await fetchEventDetail(EV_ID);
    expect(ev).not.toBeNull();
    expect(ev?.availability).toBeNull();
  });

  it("event 自体が見つからないとき null を返す (availability も発行しない)", async () => {
    plan.eventDetail = { data: null, error: null };
    const { fetchEventDetail } = await import("./event-client");
    const ev = await fetchEventDetail(EV_ID);
    expect(ev).toBeNull();
  });
});
