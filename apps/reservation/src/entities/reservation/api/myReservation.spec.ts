import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = {
  from: vi.fn(),
};

const builderMock = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.from.mockReturnValue(builderMock);
  builderMock.select.mockReturnValue(builderMock);
  builderMock.eq.mockReturnValue(builderMock);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const RESERVATION_ID = "11111111-1111-1111-1111-111111111111";
const UID = "00000000-0000-0000-0000-000000000001";

describe("fetchMyReservation", () => {
  it("reservations.id と member_id の二重防衛で取得する", async () => {
    builderMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { fetchMyReservation } = await import("./myReservation");
    await fetchMyReservation(RESERVATION_ID, UID);

    expect(supabaseMock.from).toHaveBeenCalledWith("reservations");
    expect(builderMock.select).toHaveBeenCalledWith(
      expect.stringContaining(
        "events(id, name, start_at, end_at, fee, venue_id, venues(name, default_fee))",
      ),
    );
    // 編集 sheet 初期値供給のため note も SELECT する (#215)
    expect(builderMock.select).toHaveBeenCalledWith(
      expect.stringContaining("note"),
    );
    // 経験レベルは予約画面に不要のため JOIN しない (#212)
    expect(builderMock.select).not.toHaveBeenCalledWith(
      expect.stringContaining("members(experience_level)"),
    );
    expect(builderMock.eq).toHaveBeenCalledWith("id", RESERVATION_ID);
    expect(builderMock.eq).toHaveBeenCalledWith("member_id", UID);
  });

  it("0 行ヒット (他会員の予約 / 存在しない UUID) は null を返す", async () => {
    builderMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { fetchMyReservation } = await import("./myReservation");
    const result = await fetchMyReservation(RESERVATION_ID, UID);

    expect(result).toBeNull();
  });

  it("自分の予約 1 行を MyReservationDetail に変換する", async () => {
    builderMock.maybeSingle.mockResolvedValueOnce({
      data: {
        id: RESERVATION_ID,
        status: "reserved",
        guest_count: 1,
        note: "アレルギーあり",
        created_at: "2026-04-27T05:32:00Z",
        cancelled_at: null,
        member_id: UID,
        events: {
          id: "22222222-2222-2222-2222-222222222222",
          name: "ゆる練 vol.43",
          start_at: "2026-05-15T10:30:00Z",
          end_at: "2026-05-15T12:30:00Z",
          fee: 1000,
          venue_id: "33333333-3333-3333-3333-333333333333",
          venues: {
            name: "亀戸スポーツセンター",
            default_fee: 1200,
          },
        },
      },
      error: null,
    });

    const { fetchMyReservation } = await import("./myReservation");
    const result = await fetchMyReservation(RESERVATION_ID, UID);

    expect(result).not.toBeNull();
    expect(result?.id).toBe(RESERVATION_ID);
    expect(result?.event.name).toBe("ゆる練 vol.43");
    expect(result?.event.venueName).toBe("亀戸スポーツセンター");
    expect(result?.event.fee).toBe(1000);
    expect(result?.note).toBe("アレルギーあり");
    // member.experienceLevel フィールドは存在しない (#212)
    expect((result as unknown as { member?: unknown })?.member).toBeUndefined();
  });

  it("note が NULL の場合は空文字に正規化される", async () => {
    builderMock.maybeSingle.mockResolvedValueOnce({
      data: {
        id: RESERVATION_ID,
        status: "reserved",
        guest_count: 0,
        note: null,
        created_at: "2026-04-27T05:32:00Z",
        cancelled_at: null,
        member_id: UID,
        events: {
          id: "22222222-2222-2222-2222-222222222222",
          name: "test",
          start_at: "2026-05-15T10:30:00Z",
          end_at: "2026-05-15T12:30:00Z",
          fee: 1000,
          venue_id: "33333333-3333-3333-3333-333333333333",
          venues: {
            name: "亀戸",
            default_fee: 1000,
          },
        },
      },
      error: null,
    });

    const { fetchMyReservation } = await import("./myReservation");
    const result = await fetchMyReservation(RESERVATION_ID, UID);

    expect(result?.note).toBe("");
  });

  it("events.fee が NULL のとき venues.default_fee で COALESCE する", async () => {
    builderMock.maybeSingle.mockResolvedValueOnce({
      data: {
        id: RESERVATION_ID,
        status: "reserved",
        guest_count: 0,
        created_at: "2026-04-27T05:32:00Z",
        cancelled_at: null,
        member_id: UID,
        events: {
          id: "22222222-2222-2222-2222-222222222222",
          name: "test",
          start_at: "2026-05-15T10:30:00Z",
          end_at: "2026-05-15T12:30:00Z",
          fee: null,
          venue_id: "33333333-3333-3333-3333-333333333333",
          venues: {
            name: "板橋区立体育館",
            default_fee: 1500,
          },
        },
      },
      error: null,
    });

    const { fetchMyReservation } = await import("./myReservation");
    const result = await fetchMyReservation(RESERVATION_ID, UID);

    expect(result?.event.fee).toBe(1500);
  });

  it("events JOIN が NULL の場合は null を返す (foreign key 不整合の防御)", async () => {
    builderMock.maybeSingle.mockResolvedValueOnce({
      data: {
        id: RESERVATION_ID,
        status: "reserved",
        guest_count: 0,
        created_at: "2026-04-27T05:32:00Z",
        cancelled_at: null,
        member_id: UID,
        events: null,
      },
      error: null,
    });

    const { fetchMyReservation } = await import("./myReservation");
    const result = await fetchMyReservation(RESERVATION_ID, UID);

    expect(result).toBeNull();
  });

  it("Supabase エラーは throw して呼び出し側に伝える", async () => {
    builderMock.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "network error" },
    });

    const { fetchMyReservation } = await import("./myReservation");
    await expect(fetchMyReservation(RESERVATION_ID, UID)).rejects.toEqual({
      message: "network error",
    });
  });
});
