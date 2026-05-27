import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeEventId, unsafeReservationId } from "@high-q/shared";
import type { MyReservationItem } from "@/entities/reservation";

const apiMock = {
  fetchMyReservations: vi.fn(),
};

vi.mock("@/entities/reservation", async () => {
  const actual = await vi.importActual<typeof import("@/entities/reservation")>(
    "@/entities/reservation",
  );
  return {
    ...actual,
    fetchMyReservations: (...args: unknown[]) =>
      apiMock.fetchMyReservations(...args),
  };
});

function makeReservation(
  id: string,
  status: MyReservationItem["status"],
  startAtIso: string,
): MyReservationItem {
  return {
    id: unsafeReservationId(id),
    status,
    guestCount: 0,
    cancelledAt: status === "cancelled" ? "2026-04-30T00:00:00Z" : null,
    event: {
      id: unsafeEventId(`ev-${id}`),
      name: `イベント ${id}`,
      startAt: startAtIso,
      endAt: new Date(new Date(startAtIso).getTime() + 7200_000).toISOString(),
      fee: 1000,
      venueName: "亀戸スポーツセンター",
      availability: null,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // 固定 now: 2026-05-07 00:00:00 UTC = 2026-05-07 09:00 JST
  vi.setSystemTime(new Date("2026-05-07T00:00:00Z"));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useNextReservation", () => {
  it("予約 0 件: reservation = null", async () => {
    apiMock.fetchMyReservations.mockResolvedValueOnce([]);
    const { useNextReservation } = await import("./useNextReservation");
    const c = useNextReservation("uid-1");
    await Promise.resolve();
    await Promise.resolve();
    expect(c.reservation.value).toBeNull();
    expect(c.loading.value).toBe(false);
    expect(c.error.value).toBeNull();
  });

  it("過去予約のみ: reservation = null (未来条件で除外)", async () => {
    apiMock.fetchMyReservations.mockResolvedValueOnce([
      makeReservation("r1", "reserved", "2026-04-01T10:00:00Z"),
      makeReservation("r2", "attended", "2026-03-01T10:00:00Z"),
    ]);
    const { useNextReservation } = await import("./useNextReservation");
    const c = useNextReservation("uid-1");
    await Promise.resolve();
    await Promise.resolve();
    expect(c.reservation.value).toBeNull();
  });

  it("cancelled 予約のみ: reservation = null (status 条件で除外)", async () => {
    apiMock.fetchMyReservations.mockResolvedValueOnce([
      makeReservation("r1", "cancelled", "2026-06-01T10:00:00Z"),
    ]);
    const { useNextReservation } = await import("./useNextReservation");
    const c = useNextReservation("uid-1");
    await Promise.resolve();
    await Promise.resolve();
    expect(c.reservation.value).toBeNull();
  });

  it("未来予約 1 件: その 1 件が選ばれる", async () => {
    const target = makeReservation("r1", "reserved", "2026-05-12T10:30:00Z");
    apiMock.fetchMyReservations.mockResolvedValueOnce([target]);
    const { useNextReservation } = await import("./useNextReservation");
    const c = useNextReservation("uid-1");
    await Promise.resolve();
    await Promise.resolve();
    expect(c.reservation.value?.id).toBe(target.id);
  });

  it("未来予約 2 件: 開催日が早いほうが選ばれる", async () => {
    const earlier = makeReservation("r1", "reserved", "2026-05-12T10:30:00Z");
    const later = makeReservation("r2", "reserved", "2026-05-19T10:30:00Z");
    // 並び順は API の戻り次第なので逆順で渡しても composable 内で最早が選ばれる
    apiMock.fetchMyReservations.mockResolvedValueOnce([later, earlier]);
    const { useNextReservation } = await import("./useNextReservation");
    const c = useNextReservation("uid-1");
    await Promise.resolve();
    await Promise.resolve();
    expect(c.reservation.value?.id).toBe(earlier.id);
  });

  it("API エラー時: error がセットされ reservation = null", async () => {
    apiMock.fetchMyReservations.mockRejectedValueOnce(new Error("boom"));
    const { useNextReservation } = await import("./useNextReservation");
    const c = useNextReservation("uid-1");
    await Promise.resolve();
    await Promise.resolve();
    expect(c.reservation.value).toBeNull();
    expect(c.error.value).toBeInstanceOf(Error);
    expect(c.loading.value).toBe(false);
  });

  it("reload() で再取得できる", async () => {
    apiMock.fetchMyReservations.mockResolvedValueOnce([]);
    const { useNextReservation } = await import("./useNextReservation");
    const c = useNextReservation("uid-1");
    await Promise.resolve();
    await Promise.resolve();
    expect(c.reservation.value).toBeNull();

    const next = makeReservation("r1", "reserved", "2026-05-12T10:30:00Z");
    apiMock.fetchMyReservations.mockResolvedValueOnce([next]);
    await c.reload();
    expect(c.reservation.value?.id).toBe(next.id);
  });
});
