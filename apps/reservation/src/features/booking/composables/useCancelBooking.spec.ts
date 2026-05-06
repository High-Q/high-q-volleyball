import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeReservationId } from "@high-q/shared";

const apiMock = {
  insertReservation: vi.fn(),
  cancelReservation: vi.fn(),
};

vi.mock("../api/booking-client", async () => {
  const actual = await vi.importActual<typeof import("../api/booking-client")>(
    "../api/booking-client",
  );
  return {
    ...actual,
    insertReservation: (...args: unknown[]) => apiMock.insertReservation(...args),
    cancelReservation: (...args: unknown[]) => apiMock.cancelReservation(...args),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("isCancellable", () => {
  it("start_at が未来ならキャンセル可能", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(isCancellable(future)).toBe(true);
  });

  it("start_at が過去ならキャンセル不可", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    expect(isCancellable(past)).toBe(false);
  });

  it("start_at が現在時刻と等しいときキャンセル不可 (start_at <= now)", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    const now = new Date("2026-05-06T12:00:00Z");
    expect(isCancellable(now.toISOString(), now)).toBe(false);
  });

  it("不正な ISO 文字列は false (キャンセル不可) として扱う", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    expect(isCancellable("not-a-date")).toBe(false);
  });

  it("events.cancel_deadline は判定に使われない (start_at だけで決まる)", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    // cancel_deadline 相当の値が過去でも、start_at が未来ならキャンセル可
    const futureStart = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(isCancellable(futureStart)).toBe(true);
  });
});

describe("useCancelBooking - 成功", () => {
  it("UPDATE 成功で true を返す", async () => {
    apiMock.cancelReservation.mockResolvedValueOnce(undefined);
    const { useCancelBooking } = await import("./useCancelBooking");
    const c = useCancelBooking();

    const ok = await c.cancel(unsafeReservationId("rs-1"));

    expect(ok).toBe(true);
    expect(c.error.value).toBeNull();
    expect(c.submitting.value).toBe(false);
  });
});

describe("useCancelBooking - エラーマッピング", () => {
  it("RLS 違反 / 0 行更新を 'rls' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.cancelReservation.mockRejectedValueOnce(new BookingApiError("rls"));
    const { useCancelBooking } = await import("./useCancelBooking");
    const c = useCancelBooking();

    const ok = await c.cancel(unsafeReservationId("rs-1"));

    expect(ok).toBe(false);
    expect(c.error.value).toBe("rls");
  });

  it("ネットワーク系を 'network' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.cancelReservation.mockRejectedValueOnce(
      new BookingApiError("network"),
    );
    const { useCancelBooking } = await import("./useCancelBooking");
    const c = useCancelBooking();

    await c.cancel(unsafeReservationId("rs-1"));

    expect(c.error.value).toBe("network");
  });
});

describe("useCancelBooking - 二重送信防止", () => {
  it("submitting=true の間は再 cancel() が false を返し UPDATE は呼ばれない", async () => {
    const deferred: { resolve: () => void } = { resolve: () => undefined };
    apiMock.cancelReservation.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          deferred.resolve = () => resolve();
        }),
    );
    const { useCancelBooking } = await import("./useCancelBooking");
    const c = useCancelBooking();

    const first = c.cancel(unsafeReservationId("rs-1"));
    const second = await c.cancel(unsafeReservationId("rs-1"));
    expect(second).toBe(false);
    expect(apiMock.cancelReservation).toHaveBeenCalledTimes(1);

    deferred.resolve();
    await first;
  });
});
