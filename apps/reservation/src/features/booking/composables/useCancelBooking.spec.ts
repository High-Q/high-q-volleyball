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

const notificationMock = {
  triggerReservationNotification: vi.fn(),
};

vi.mock("@/shared/api/reservation-notification", () => ({
  triggerReservationNotification: (...args: unknown[]) =>
    notificationMock.triggerReservationNotification(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  notificationMock.triggerReservationNotification.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("isCancellable (JST 前日中まで)", () => {
  it("開催前日 23:59 JST はキャンセル可能", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    // start_at = 2026-05-15 19:30 JST
    const startAt = "2026-05-15T10:30:00Z";
    // now = 2026-05-14 23:59 JST = 2026-05-14 14:59 UTC
    const now = new Date("2026-05-14T14:59:00Z");
    expect(isCancellable(startAt, now)).toBe(true);
  });

  it("開催当日 00:00 JST 丁度はキャンセル不可", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    // start_at = 2026-05-15 19:30 JST
    const startAt = "2026-05-15T10:30:00Z";
    // now = 2026-05-15 00:00 JST = 2026-05-14 15:00 UTC
    const now = new Date("2026-05-14T15:00:00Z");
    expect(isCancellable(startAt, now)).toBe(false);
  });

  it("開催当日 09:00 JST はキャンセル不可", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    const startAt = "2026-05-15T10:30:00Z"; // 19:30 JST
    const now = new Date("2026-05-15T00:00:00Z"); // 09:00 JST 当日
    expect(isCancellable(startAt, now)).toBe(false);
  });

  it("開催開始以降はキャンセル不可", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    const startAt = "2026-05-15T10:30:00Z";
    const now = new Date("2026-05-15T11:00:00Z"); // 20:00 JST = 開催後
    expect(isCancellable(startAt, now)).toBe(false);
  });

  it("開催 2 日前はキャンセル可能", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    const startAt = "2026-05-15T10:30:00Z";
    const now = new Date("2026-05-13T05:00:00Z"); // 2026-05-13 14:00 JST
    expect(isCancellable(startAt, now)).toBe(true);
  });

  it("不正な ISO 文字列は false (キャンセル不可) として扱う", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    expect(isCancellable("not-a-date")).toBe(false);
  });

  it("events.cancel_deadline は判定に使われない (start_at の JST 開催日だけで決まる)", async () => {
    const { isCancellable } = await import("./useCancelBooking");
    // cancel_deadline 相当の値が過去でも、現在時刻が JST 前日 23:59 までならキャンセル可
    const startAt = "2026-05-15T10:30:00Z";
    const now = new Date("2026-05-14T10:00:00Z"); // 19:00 JST 前日
    expect(isCancellable(startAt, now)).toBe(true);
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

describe("useCancelBooking - キャンセル完了メール送信トリガ", () => {
  it("UPDATE 成功時に triggerReservationNotification('cancelled') が発火される", async () => {
    apiMock.cancelReservation.mockResolvedValueOnce(undefined);
    const { useCancelBooking } = await import("./useCancelBooking");
    const c = useCancelBooking();

    await c.cancel(unsafeReservationId("rs-1"));

    expect(notificationMock.triggerReservationNotification).toHaveBeenCalledTimes(1);
    expect(notificationMock.triggerReservationNotification).toHaveBeenCalledWith(
      "rs-1",
      "cancelled",
    );
  });

  it("メール送信トリガ自体が例外を投げても cancel() は成功扱い", async () => {
    apiMock.cancelReservation.mockResolvedValueOnce(undefined);
    notificationMock.triggerReservationNotification.mockImplementationOnce(() => {
      throw new Error("notification boom");
    });
    const { useCancelBooking } = await import("./useCancelBooking");
    const c = useCancelBooking();

    const ok = await c.cancel(unsafeReservationId("rs-1"));

    expect(ok).toBe(true);
    expect(c.error.value).toBeNull();
  });

  it("UPDATE 失敗時はメール送信トリガが発火されない", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.cancelReservation.mockRejectedValueOnce(new BookingApiError("rls"));
    const { useCancelBooking } = await import("./useCancelBooking");
    const c = useCancelBooking();

    await c.cancel(unsafeReservationId("rs-1"));

    expect(notificationMock.triggerReservationNotification).not.toHaveBeenCalled();
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
