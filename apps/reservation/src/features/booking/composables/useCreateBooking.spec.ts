import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeEventId, unsafeMemberId, unsafeReservationId } from "@high-q/shared";

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

const sampleInput = {
  eventId: unsafeEventId("ev-1"),
  memberId: unsafeMemberId("mb-1"),
  guestCount: 0,
  note: "",
  phoneAtBooking: "090-1111-2222",
};

const sampleReservation = {
  id: unsafeReservationId("rs-1"),
  eventId: unsafeEventId("ev-1"),
  memberId: unsafeMemberId("mb-1"),
  status: "reserved" as const,
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

describe("useCreateBooking - 成功", () => {
  it("INSERT 成功で reservation が返る", async () => {
    apiMock.insertReservation.mockResolvedValueOnce(sampleReservation);
    const { useCreateBooking } = await import("./useCreateBooking");
    const c = useCreateBooking();

    const r = await c.create(sampleInput);

    expect(r).toEqual(sampleReservation);
    expect(c.reservation.value).toEqual(sampleReservation);
    expect(c.error.value).toBeNull();
    expect(c.submitting.value).toBe(false);
  });
});

describe("useCreateBooking - エラーマッピング", () => {
  it("UNIQUE 違反 (BookingApiError 'duplicate') を 'duplicate' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.insertReservation.mockRejectedValueOnce(
      new BookingApiError("duplicate"),
    );
    const { useCreateBooking } = await import("./useCreateBooking");
    const c = useCreateBooking();

    const r = await c.create(sampleInput);

    expect(r).toBeNull();
    expect(c.error.value).toBe("duplicate");
  });

  it("RLS 違反 (BookingApiError 'rls') を 'rls' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.insertReservation.mockRejectedValueOnce(new BookingApiError("rls"));
    const { useCreateBooking } = await import("./useCreateBooking");
    const c = useCreateBooking();

    await c.create(sampleInput);

    expect(c.error.value).toBe("rls");
  });

  it("ネットワーク系 (BookingApiError 'network') を 'network' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.insertReservation.mockRejectedValueOnce(
      new BookingApiError("network"),
    );
    const { useCreateBooking } = await import("./useCreateBooking");
    const c = useCreateBooking();

    await c.create(sampleInput);

    expect(c.error.value).toBe("network");
  });

  it("未知のエラーを 'unknown' に変換", async () => {
    apiMock.insertReservation.mockRejectedValueOnce(new Error("boom"));
    const { useCreateBooking } = await import("./useCreateBooking");
    const c = useCreateBooking();

    await c.create(sampleInput);

    expect(c.error.value).toBe("unknown");
  });
});

describe("useCreateBooking - 二重送信防止", () => {
  it("submitting=true の間は再 create() が即座に null を返し insert は呼ばれない", async () => {
    const deferred: { resolve: () => void } = { resolve: () => undefined };
    apiMock.insertReservation.mockImplementationOnce(
      () =>
        new Promise<typeof sampleReservation>((resolve) => {
          deferred.resolve = () => resolve(sampleReservation);
        }),
    );
    const { useCreateBooking } = await import("./useCreateBooking");
    const c = useCreateBooking();

    const first = c.create(sampleInput);
    const second = await c.create(sampleInput);
    expect(second).toBeNull();
    expect(apiMock.insertReservation).toHaveBeenCalledTimes(1);

    deferred.resolve();
    await first;
  });
});
