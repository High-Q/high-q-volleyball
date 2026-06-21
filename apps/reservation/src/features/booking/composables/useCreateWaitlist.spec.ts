import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeEventId, unsafeMemberId, unsafeReservationId } from "@high-q/shared";

const apiMock = {
  insertWaitlist: vi.fn(),
};

const notificationMock = {
  triggerReservationNotification: vi.fn(),
};

vi.mock("../api/booking-client", async () => {
  const actual = await vi.importActual<typeof import("../api/booking-client")>(
    "../api/booking-client",
  );
  return {
    ...actual,
    insertWaitlist: (...args: unknown[]) => apiMock.insertWaitlist(...args),
  };
});

vi.mock("@/shared/api/reservation-notification", () => ({
  triggerReservationNotification: (...args: unknown[]) =>
    notificationMock.triggerReservationNotification(...args),
}));

const sampleInput = {
  eventId: unsafeEventId("ev-1"),
  memberId: unsafeMemberId("mb-1"),
  guestCount: 0,
  note: "",
  phoneAtBooking: "090-1111-2222",
};

const sampleWaitlist = {
  id: unsafeReservationId("rs-1"),
  eventId: unsafeEventId("ev-1"),
  memberId: unsafeMemberId("mb-1"),
  status: "waitlist" as const,
  guestCount: 0,
  phoneAtBooking: "090-1111-2222",
  note: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useCreateWaitlist - 成功", () => {
  it("INSERT 成功で status='waitlist' の reservation が返る", async () => {
    apiMock.insertWaitlist.mockResolvedValueOnce(sampleWaitlist);
    const { useCreateWaitlist } = await import("./useCreateWaitlist");
    const c = useCreateWaitlist();

    const r = await c.create(sampleInput);

    expect(r).toEqual(sampleWaitlist);
    expect(c.reservation.value).toEqual(sampleWaitlist);
    expect(c.error.value).toBeNull();
    expect(c.submitting.value).toBe(false);
  });
});

describe("useCreateWaitlist - メールは送らない (D5)", () => {
  it("INSERT 成功時に通知メールトリガを一切発火しない", async () => {
    apiMock.insertWaitlist.mockResolvedValueOnce(sampleWaitlist);
    const { useCreateWaitlist } = await import("./useCreateWaitlist");
    const c = useCreateWaitlist();

    await c.create(sampleInput);

    expect(
      notificationMock.triggerReservationNotification,
    ).not.toHaveBeenCalled();
  });
});

describe("useCreateWaitlist - エラーマッピング", () => {
  it("二重登録 (BookingApiError 'duplicate') を 'duplicate' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.insertWaitlist.mockRejectedValueOnce(new BookingApiError("duplicate"));
    const { useCreateWaitlist } = await import("./useCreateWaitlist");
    const c = useCreateWaitlist();

    const r = await c.create(sampleInput);

    expect(r).toBeNull();
    expect(c.error.value).toBe("duplicate");
  });

  it("RLS 違反 (BookingApiError 'rls') を 'rls' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.insertWaitlist.mockRejectedValueOnce(new BookingApiError("rls"));
    const { useCreateWaitlist } = await import("./useCreateWaitlist");
    const c = useCreateWaitlist();

    await c.create(sampleInput);

    expect(c.error.value).toBe("rls");
  });

  it("ネットワーク系 (BookingApiError 'network') を 'network' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.insertWaitlist.mockRejectedValueOnce(new BookingApiError("network"));
    const { useCreateWaitlist } = await import("./useCreateWaitlist");
    const c = useCreateWaitlist();

    await c.create(sampleInput);

    expect(c.error.value).toBe("network");
  });

  it("未知のエラーを 'unknown' に変換", async () => {
    apiMock.insertWaitlist.mockRejectedValueOnce(new Error("boom"));
    const { useCreateWaitlist } = await import("./useCreateWaitlist");
    const c = useCreateWaitlist();

    await c.create(sampleInput);

    expect(c.error.value).toBe("unknown");
  });
});

describe("useCreateWaitlist - 二重送信防止", () => {
  it("submitting=true の間は再 create() が即座に null を返し insert は呼ばれない", async () => {
    const deferred: { resolve: () => void } = { resolve: () => undefined };
    apiMock.insertWaitlist.mockImplementationOnce(
      () =>
        new Promise<typeof sampleWaitlist>((resolve) => {
          deferred.resolve = () => resolve(sampleWaitlist);
        }),
    );
    const { useCreateWaitlist } = await import("./useCreateWaitlist");
    const c = useCreateWaitlist();

    const first = c.create(sampleInput);
    const second = await c.create(sampleInput);
    expect(second).toBeNull();
    expect(apiMock.insertWaitlist).toHaveBeenCalledTimes(1);

    deferred.resolve();
    await first;
  });
});
