import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = {
  from: vi.fn(),
};

const builderMock = {
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.from.mockReturnValue(builderMock);
  builderMock.select.mockReturnValue(builderMock);
  builderMock.eq.mockReturnValue(builderMock);
  builderMock.order.mockReturnValue(builderMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchMyReservations", () => {
  it("自分の member_id を WHERE で渡し、start_at DESC で取得する", async () => {
    const uid = "00000000-0000-0000-0000-000000000001";
    builderMock.order.mockResolvedValueOnce({ data: [], error: null });

    const { fetchMyReservations } = await import("./myReservations");
    await fetchMyReservations(uid);

    expect(supabaseMock.from).toHaveBeenCalledWith("reservations");
    expect(builderMock.select).toHaveBeenCalledWith(
      expect.stringContaining("events(id, name, start_at"),
    );
    expect(builderMock.eq).toHaveBeenCalledWith("member_id", uid);
    expect(builderMock.order).toHaveBeenCalledWith("start_at", {
      foreignTable: "events",
      ascending: false,
    });
  });

  it("JOIN 結果から MyReservationItem に変換する (events の各列が揃う)", async () => {
    const uid = "00000000-0000-0000-0000-000000000001";
    builderMock.order.mockResolvedValueOnce({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          status: "reserved",
          guest_count: 1,
          cancelled_at: null,
          event_id: "22222222-2222-2222-2222-222222222222",
          member_id: uid,
          events: {
            id: "22222222-2222-2222-2222-222222222222",
            name: "ゆる練 vol.43",
            start_at: "2026-06-01T19:00:00Z",
            end_at: "2026-06-01T21:00:00Z",
            fee: 1500,
            venue_id: "33333333-3333-3333-3333-333333333333",
            venues: {
              name: "板橋区立体育館",
              default_fee: 1200,
            },
          },
        },
      ],
      error: null,
    });

    const { fetchMyReservations } = await import("./myReservations");
    const items = await fetchMyReservations(uid);

    expect(items).toHaveLength(1);
    expect(items[0]?.event.name).toBe("ゆる練 vol.43");
    expect(items[0]?.event.fee).toBe(1500);
    expect(items[0]?.event.venueName).toBe("板橋区立体育館");
  });

  it("events.fee が NULL のとき venues.default_fee にフォールバック", async () => {
    builderMock.order.mockResolvedValueOnce({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          status: "attended",
          guest_count: 0,
          cancelled_at: null,
          event_id: "22222222-2222-2222-2222-222222222222",
          member_id: "00000000-0000-0000-0000-000000000001",
          events: {
            id: "22222222-2222-2222-2222-222222222222",
            name: "test",
            start_at: "2026-04-01T19:00:00Z",
            end_at: "2026-04-01T21:00:00Z",
            fee: null,
            venue_id: "33333333-3333-3333-3333-333333333333",
            venues: { name: "v", default_fee: 1100 },
          },
        },
      ],
      error: null,
    });
    const { fetchMyReservations } = await import("./myReservations");
    const items = await fetchMyReservations(
      "00000000-0000-0000-0000-000000000001",
    );
    expect(items[0]?.event.fee).toBe(1100);
  });

  it("error が返ってきたら throw する", async () => {
    builderMock.order.mockResolvedValueOnce({
      data: null,
      error: { message: "RLS denied", code: "42501" },
    });
    const { fetchMyReservations } = await import("./myReservations");
    await expect(
      fetchMyReservations("00000000-0000-0000-0000-000000000001"),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("events が NULL の行はフィルタで除外する (孤立予約は表示しない)", async () => {
    builderMock.order.mockResolvedValueOnce({
      data: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          status: "reserved",
          guest_count: 0,
          cancelled_at: null,
          event_id: "22222222-2222-2222-2222-222222222222",
          member_id: "00000000-0000-0000-0000-000000000001",
          events: null,
        },
      ],
      error: null,
    });
    const { fetchMyReservations } = await import("./myReservations");
    const items = await fetchMyReservations(
      "00000000-0000-0000-0000-000000000001",
    );
    expect(items).toHaveLength(0);
  });
});
