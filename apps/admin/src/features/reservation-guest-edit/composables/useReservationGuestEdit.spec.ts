import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReservationId } from "@high-q/shared";

const updateGuestCountMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/entities/reservation", () => ({
  updateGuestCount: (...args: unknown[]) => updateGuestCountMock(...args),
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const RID = "00000000-0000-0000-0000-00000000a001" as unknown as ReservationId;

describe("useReservationGuestEdit — 正常系", () => {
  it("成功時に rollback も Toast も呼ばない", async () => {
    updateGuestCountMock.mockResolvedValue({ ok: true, value: undefined });
    const { useReservationGuestEdit } = await import(
      "./useReservationGuestEdit"
    );
    const c = useReservationGuestEdit();
    const onRollback = vi.fn();

    await c.setGuestCount({
      reservationId: RID,
      prevCount: 0,
      nextCount: 2,
      onRollback,
    });

    expect(updateGuestCountMock).toHaveBeenCalledWith(RID, 2);
    expect(onRollback).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("prev === next なら mutation を呼ばない", async () => {
    const { useReservationGuestEdit } = await import(
      "./useReservationGuestEdit"
    );
    const c = useReservationGuestEdit();

    await c.setGuestCount({
      reservationId: RID,
      prevCount: 1,
      nextCount: 1,
      onRollback: vi.fn(),
    });

    expect(updateGuestCountMock).not.toHaveBeenCalled();
  });
});

describe("useReservationGuestEdit — 失敗時", () => {
  it("失敗時に rollback + Toast", async () => {
    updateGuestCountMock.mockResolvedValue({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "" },
    });
    const { useReservationGuestEdit } = await import(
      "./useReservationGuestEdit"
    );
    const c = useReservationGuestEdit();
    const onRollback = vi.fn();

    await c.setGuestCount({
      reservationId: RID,
      prevCount: 0,
      nextCount: 2,
      onRollback,
    });

    expect(onRollback).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "同伴者数の更新に失敗しました",
        variant: "destructive",
      }),
    );
  });
});

describe("useReservationGuestEdit — in-flight ガード", () => {
  it("mutation 中の同 ID への 2 回目は no-op", async () => {
    let resolveFirst!: (value: unknown) => void;
    const firstPromise = new Promise((r) => {
      resolveFirst = r;
    });
    updateGuestCountMock.mockReturnValueOnce(firstPromise);
    const { useReservationGuestEdit } = await import(
      "./useReservationGuestEdit"
    );
    const c = useReservationGuestEdit();
    const onRollback2 = vi.fn();

    void c.setGuestCount({
      reservationId: RID,
      prevCount: 0,
      nextCount: 1,
      onRollback: vi.fn(),
    });

    expect(c.isInFlight(RID)).toBe(true);

    await c.setGuestCount({
      reservationId: RID,
      prevCount: 1,
      nextCount: 2,
      onRollback: onRollback2,
    });

    expect(updateGuestCountMock).toHaveBeenCalledTimes(1);
    expect(onRollback2).not.toHaveBeenCalled();

    resolveFirst({ ok: true, value: undefined });
    await firstPromise;
  });

  it("成功後は in-flight が解放される", async () => {
    updateGuestCountMock.mockResolvedValue({ ok: true, value: undefined });
    const { useReservationGuestEdit } = await import(
      "./useReservationGuestEdit"
    );
    const c = useReservationGuestEdit();

    await c.setGuestCount({
      reservationId: RID,
      prevCount: 0,
      nextCount: 1,
      onRollback: vi.fn(),
    });

    expect(c.isInFlight(RID)).toBe(false);
  });
});
