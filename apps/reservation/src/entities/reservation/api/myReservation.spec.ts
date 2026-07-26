import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reservationsBuilder = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};

const supabaseMock = {
  from: vi.fn(() => reservationsBuilder),
  rpc: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  supabaseMock.from.mockImplementation(() => reservationsBuilder);
  reservationsBuilder.select.mockReturnValue(reservationsBuilder);
  reservationsBuilder.eq.mockReturnValue(reservationsBuilder);
  // デフォルト: availability は取れない (空配列) 想定。各テストで上書き
  supabaseMock.rpc.mockResolvedValue({ data: [], error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const RESERVATION_ID = "11111111-1111-1111-1111-111111111111";
const UID = "00000000-0000-0000-0000-000000000001";

describe("fetchMyReservation", () => {
  it("reservations.id と member_id の二重防衛で取得する", async () => {
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { fetchMyReservation } = await import("./myReservation");
    await fetchMyReservation(RESERVATION_ID, UID);

    expect(supabaseMock.from).toHaveBeenCalledWith("reservations");
    expect(reservationsBuilder.select).toHaveBeenCalledWith(
      expect.stringContaining(
        "events(id, name, start_at, end_at, fee, venue_id, venues(name, default_fee))",
      ),
    );
    // 編集 sheet 初期値供給のため note も SELECT する (#215)
    expect(reservationsBuilder.select).toHaveBeenCalledWith(
      expect.stringContaining("note"),
    );
    // 経験レベルは予約画面に不要のため JOIN しない (#212)
    expect(reservationsBuilder.select).not.toHaveBeenCalledWith(
      expect.stringContaining("members(experience_level)"),
    );
    expect(reservationsBuilder.eq).toHaveBeenCalledWith("id", RESERVATION_ID);
    expect(reservationsBuilder.eq).toHaveBeenCalledWith("member_id", UID);
  });

  it("0 行ヒット (他会員の予約 / 存在しない UUID) は null を返す", async () => {
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { fetchMyReservation } = await import("./myReservation");
    const result = await fetchMyReservation(RESERVATION_ID, UID);

    expect(result).toBeNull();
  });

  it("自分の予約 1 行を MyReservationDetail に変換する", async () => {
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
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
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
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
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
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
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
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
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "network error" },
    });

    const { fetchMyReservation } = await import("./myReservation");
    await expect(fetchMyReservation(RESERVATION_ID, UID)).rejects.toEqual({
      message: "network error",
    });
  });

  // ---------- Issue #305: availability merge ----------

  it("availability を別クエリで取得して MyReservationDetail.event.availability に埋める", async () => {
    const evId = "22222222-2222-2222-2222-222222222222";
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
      data: {
        id: RESERVATION_ID,
        status: "reserved",
        guest_count: 0,
        note: null,
        created_at: "2026-04-27T05:32:00Z",
        cancelled_at: null,
        member_id: UID,
        events: {
          id: evId,
          name: "ゆる練",
          start_at: "2026-06-03T10:00:00Z",
          end_at: "2026-06-03T12:00:00Z",
          fee: 1000,
          venue_id: "33333333-3333-3333-3333-333333333333",
          venues: { name: "亀戸", default_fee: null },
        },
      },
      error: null,
    });
    supabaseMock.rpc.mockResolvedValueOnce({
      data: [{ event_id: evId, capacity: 18, reserved_count: 14 }],
      error: null,
    });

    const { fetchMyReservation } = await import("./myReservation");
    const result = await fetchMyReservation(RESERVATION_ID, UID);

    expect(supabaseMock.rpc).toHaveBeenCalledWith("get_event_availability", {
      p_event_ids: [evId],
    });
    expect(result?.event.availability).toEqual({
      eventId: evId,
      capacity: 18,
      reservedCount: 14,
    });
  });

  it("availability 取得失敗時は availability=null で fallback、主データは継続", async () => {
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({
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
          name: "ゆる練",
          start_at: "2026-06-03T10:00:00Z",
          end_at: "2026-06-03T12:00:00Z",
          fee: 1000,
          venue_id: "33333333-3333-3333-3333-333333333333",
          venues: { name: "v", default_fee: null },
        },
      },
      error: null,
    });
    supabaseMock.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "view down" },
    });

    const { fetchMyReservation } = await import("./myReservation");
    const result = await fetchMyReservation(RESERVATION_ID, UID);

    expect(result?.event.availability).toBeNull();
    expect(result?.event.name).toBe("ゆる練");
  });

  it("予約が見つからない場合は availability クエリを発行しない", async () => {
    reservationsBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const { fetchMyReservation } = await import("./myReservation");
    await fetchMyReservation(RESERVATION_ID, UID);

    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});
