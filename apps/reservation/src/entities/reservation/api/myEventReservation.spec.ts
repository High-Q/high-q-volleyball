import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reservationsBuilder = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};

const supabaseMock = {
  from: vi.fn(() => reservationsBuilder),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  reservationsBuilder.select.mockReturnValue(reservationsBuilder);
  reservationsBuilder.eq.mockReturnValue(reservationsBuilder);
  reservationsBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const eventId = "22222222-2222-2222-2222-222222222222";
const uid = "00000000-0000-0000-0000-000000000001";

describe("fetchMyEventReservation", () => {
  it("event_id と member_id の双方を WHERE 条件に渡す (RLS 二重防衛)", async () => {
    const { fetchMyEventReservation } = await import("./myEventReservation");
    await fetchMyEventReservation(eventId, uid);

    expect(supabaseMock.from).toHaveBeenCalledWith("reservations");
    expect(reservationsBuilder.eq).toHaveBeenCalledWith("event_id", eventId);
    expect(reservationsBuilder.eq).toHaveBeenCalledWith("member_id", uid);
  });

  it("自分の行があれば MyEventReservation に変換して返す", async () => {
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "11111111-1111-1111-1111-111111111111",
        status: "waitlist",
        guest_count: 2,
        note: "よろしく",
      },
      error: null,
    });
    const { fetchMyEventReservation } = await import("./myEventReservation");
    const r = await fetchMyEventReservation(eventId, uid);

    expect(r).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      status: "waitlist",
      guestCount: 2,
      note: "よろしく",
    });
  });

  it("自分の行が無ければ null を返す (未登録)", async () => {
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    const { fetchMyEventReservation } = await import("./myEventReservation");
    const r = await fetchMyEventReservation(eventId, uid);
    expect(r).toBeNull();
  });

  it("note が NULL なら空文字に正規化する", async () => {
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "11111111-1111-1111-1111-111111111111",
        status: "reserved",
        guest_count: 0,
        note: null,
      },
      error: null,
    });
    const { fetchMyEventReservation } = await import("./myEventReservation");
    const r = await fetchMyEventReservation(eventId, uid);
    expect(r?.note).toBe("");
  });

  it("エラー時は throw する", async () => {
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "boom" },
    });
    const { fetchMyEventReservation } = await import("./myEventReservation");
    await expect(fetchMyEventReservation(eventId, uid)).rejects.toBeTruthy();
  });
});
