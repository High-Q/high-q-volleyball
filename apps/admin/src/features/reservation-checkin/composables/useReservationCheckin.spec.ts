import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReservationId } from "@high-q/shared";

const toggleCheckinMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/entities/reservation", () => ({
  toggleCheckin: (...args: unknown[]) => toggleCheckinMock(...args),
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const RID = "00000000-0000-0000-0000-00000000a001" as unknown as ReservationId;

describe("useReservationCheckin — 正常系", () => {
  it("成功時に rollback を呼ばず Toast も出さない", async () => {
    toggleCheckinMock.mockResolvedValue({ ok: true, value: undefined });
    const { useReservationCheckin } = await import("./useReservationCheckin");
    const c = useReservationCheckin();
    const onRollback = vi.fn();

    await c.toggle({ reservationId: RID, currentCheckedIn: false, onRollback });

    expect(toggleCheckinMock).toHaveBeenCalledWith(RID, false);
    expect(onRollback).not.toHaveBeenCalled();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("未→済 で正しい引数を渡す", async () => {
    toggleCheckinMock.mockResolvedValue({ ok: true, value: undefined });
    const { useReservationCheckin } = await import("./useReservationCheckin");
    const c = useReservationCheckin();

    await c.toggle({
      reservationId: RID,
      currentCheckedIn: false,
      onRollback: vi.fn(),
    });

    expect(toggleCheckinMock).toHaveBeenCalledWith(RID, false);
  });

  it("済→未 で正しい引数を渡す", async () => {
    toggleCheckinMock.mockResolvedValue({ ok: true, value: undefined });
    const { useReservationCheckin } = await import("./useReservationCheckin");
    const c = useReservationCheckin();

    await c.toggle({
      reservationId: RID,
      currentCheckedIn: true,
      onRollback: vi.fn(),
    });

    expect(toggleCheckinMock).toHaveBeenCalledWith(RID, true);
  });
});

describe("useReservationCheckin — 失敗時の rollback + Toast", () => {
  it("NETWORK_ERROR で rollback + 「通信に失敗」Toast を出す", async () => {
    toggleCheckinMock.mockResolvedValue({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "" },
    });
    const { useReservationCheckin } = await import("./useReservationCheckin");
    const c = useReservationCheckin();
    const onRollback = vi.fn();

    await c.toggle({ reservationId: RID, currentCheckedIn: false, onRollback });

    expect(onRollback).toHaveBeenCalledTimes(1);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "チェックイン更新に失敗しました",
        variant: "destructive",
      }),
    );
  });

  it("ALREADY_UPDATED でも rollback + 専用メッセージ Toast", async () => {
    toggleCheckinMock.mockResolvedValue({
      ok: false,
      error: { code: "ALREADY_UPDATED", message: "" },
    });
    const { useReservationCheckin } = await import("./useReservationCheckin");
    const c = useReservationCheckin();
    const onRollback = vi.fn();

    await c.toggle({ reservationId: RID, currentCheckedIn: false, onRollback });

    expect(onRollback).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining("他の操作で状態が更新されました"),
      }),
    );
  });
});

describe("useReservationCheckin — in-flight ガード", () => {
  it("mutation 中の同 ID への 2 回目の toggle は no-op", async () => {
    let resolveFirst!: (value: unknown) => void;
    const firstPromise = new Promise((r) => {
      resolveFirst = r;
    });
    toggleCheckinMock.mockReturnValueOnce(firstPromise);

    const { useReservationCheckin } = await import("./useReservationCheckin");
    const c = useReservationCheckin();

    const onRollback1 = vi.fn();
    const onRollback2 = vi.fn();

    // 1 回目（resolve しないままにする）
    void c.toggle({
      reservationId: RID,
      currentCheckedIn: false,
      onRollback: onRollback1,
    });

    // ガード判定: in-flight 中
    expect(c.isInFlight(RID)).toBe(true);

    // 2 回目（in-flight 中のため何もせず即 return）
    await c.toggle({
      reservationId: RID,
      currentCheckedIn: false,
      onRollback: onRollback2,
    });

    // 2 回目のために toggleCheckin が 2 回呼ばれていない
    expect(toggleCheckinMock).toHaveBeenCalledTimes(1);
    expect(onRollback2).not.toHaveBeenCalled();

    // 1 回目を resolve して後始末
    resolveFirst({ ok: true, value: undefined });
    await firstPromise;
  });

  it("mutation 完了後は in-flight が解放される", async () => {
    toggleCheckinMock.mockResolvedValue({ ok: true, value: undefined });
    const { useReservationCheckin } = await import("./useReservationCheckin");
    const c = useReservationCheckin();

    await c.toggle({
      reservationId: RID,
      currentCheckedIn: false,
      onRollback: vi.fn(),
    });

    expect(c.isInFlight(RID)).toBe(false);
  });

  it("失敗時も in-flight が解放される", async () => {
    toggleCheckinMock.mockResolvedValue({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "" },
    });
    const { useReservationCheckin } = await import("./useReservationCheckin");
    const c = useReservationCheckin();

    await c.toggle({
      reservationId: RID,
      currentCheckedIn: false,
      onRollback: vi.fn(),
    });

    expect(c.isInFlight(RID)).toBe(false);
  });
});
