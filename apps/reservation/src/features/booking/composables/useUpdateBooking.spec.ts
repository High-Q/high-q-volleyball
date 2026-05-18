import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  unsafeEventId,
  unsafeMemberId,
  unsafeReservationId,
} from "@high-q/shared";

const apiMock = {
  updateReservation: vi.fn(),
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
    updateReservation: (...args: unknown[]) =>
      apiMock.updateReservation(...args),
  };
});

vi.mock("@/shared/api/reservation-notification", () => ({
  triggerReservationNotification: (...args: unknown[]) =>
    notificationMock.triggerReservationNotification(...args),
}));

const sampleInput = {
  reservationId: unsafeReservationId("rs-1"),
  memberId: unsafeMemberId("mb-1"),
  guestCount: 1,
  note: "アレルギーあり",
};

const sampleReservation = {
  id: unsafeReservationId("rs-1"),
  eventId: unsafeEventId("ev-1"),
  memberId: unsafeMemberId("mb-1"),
  status: "reserved" as const,
  guestCount: 1,
  phoneAtBooking: "090-1111-2222",
  note: "アレルギーあり",
};

/**
 * 期限内 / 期限外を切り替えるユーティリティ。
 *
 * `useCancelBooking.isCancellable` は JST カレンダー基準で「now の JST 日 < start_at の JST 日」のときのみ true。
 * テストでは Date を fake にして 2026-05-08 09:00 JST に固定し、
 * - 期限内: 2026-05-09 以降の start_at
 * - 期限外: 2026-05-08 以前の start_at
 * を使い分ける。
 */
const FAKE_NOW = new Date("2026-05-08T00:00:00+09:00");

beforeEach(() => {
  vi.clearAllMocks();
  notificationMock.triggerReservationNotification.mockResolvedValue(undefined);
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useUpdateBooking - 期限内", () => {
  it("UPDATE 成功で reservation が返る", async () => {
    apiMock.updateReservation.mockResolvedValueOnce(sampleReservation);
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    const r = await u.update(sampleInput, "2026-05-15T10:30:00+09:00");

    expect(r).toEqual(sampleReservation);
    expect(u.reservation.value).toEqual(sampleReservation);
    expect(u.error.value).toBeNull();
    expect(u.submitting.value).toBe(false);
  });
});

describe("useUpdateBooking - 期限外で API を呼ばない", () => {
  it("開催当日 0:00 JST 以降は updateReservation を呼ばず 'not_editable' を返す", async () => {
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    const r = await u.update(sampleInput, "2026-05-08T19:30:00+09:00");

    expect(r).toBeNull();
    expect(apiMock.updateReservation).not.toHaveBeenCalled();
    expect(u.error.value).toBe("not_editable");
  });

  it("既に開催開始済みでも 'not_editable' を返す", async () => {
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    const r = await u.update(sampleInput, "2026-05-07T19:30:00+09:00");

    expect(r).toBeNull();
    expect(apiMock.updateReservation).not.toHaveBeenCalled();
    expect(u.error.value).toBe("not_editable");
  });
});

describe("useUpdateBooking - エラーマッピング", () => {
  it("RLS 違反 (BookingApiError 'rls') を 'rls' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.updateReservation.mockRejectedValueOnce(new BookingApiError("rls"));
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    await u.update(sampleInput, "2026-05-15T10:30:00+09:00");

    expect(u.error.value).toBe("rls");
  });

  it("ネットワーク系 (BookingApiError 'network') を 'network' に変換", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.updateReservation.mockRejectedValueOnce(
      new BookingApiError("network"),
    );
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    await u.update(sampleInput, "2026-05-15T10:30:00+09:00");

    expect(u.error.value).toBe("network");
  });

  it("未知のエラーを 'unknown' に変換", async () => {
    apiMock.updateReservation.mockRejectedValueOnce(new Error("boom"));
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    await u.update(sampleInput, "2026-05-15T10:30:00+09:00");

    expect(u.error.value).toBe("unknown");
  });
});

describe("useUpdateBooking - 二重送信防止", () => {
  it("submitting=true の間は再 update() が即座に null を返し API は呼ばれない", async () => {
    const deferred: { resolve: () => void } = { resolve: () => undefined };
    apiMock.updateReservation.mockImplementationOnce(
      () =>
        new Promise<typeof sampleReservation>((resolve) => {
          deferred.resolve = () => resolve(sampleReservation);
        }),
    );
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    const first = u.update(sampleInput, "2026-05-15T10:30:00+09:00");
    const second = await u.update(sampleInput, "2026-05-15T10:30:00+09:00");
    expect(second).toBeNull();
    expect(apiMock.updateReservation).toHaveBeenCalledTimes(1);

    deferred.resolve();
    await first;
  });
});

describe("useUpdateBooking - 変更通知メール送信トリガ", () => {
  it("UPDATE 成功時に triggerReservationNotification('updated') が発火される", async () => {
    apiMock.updateReservation.mockResolvedValueOnce(sampleReservation);
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    await u.update(sampleInput, "2026-05-15T10:30:00+09:00");

    expect(
      notificationMock.triggerReservationNotification,
    ).toHaveBeenCalledTimes(1);
    expect(
      notificationMock.triggerReservationNotification,
    ).toHaveBeenCalledWith(sampleReservation.id, "updated");
  });

  it("期限外 (not_editable) のときはメール送信トリガが発火されない", async () => {
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    await u.update(sampleInput, "2026-05-08T19:30:00+09:00");

    expect(apiMock.updateReservation).not.toHaveBeenCalled();
    expect(
      notificationMock.triggerReservationNotification,
    ).not.toHaveBeenCalled();
  });

  it("UPDATE 失敗 (rls) のときはメール送信トリガが発火されない", async () => {
    const { BookingApiError } = await import("../api/booking-client");
    apiMock.updateReservation.mockRejectedValueOnce(new BookingApiError("rls"));
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    await u.update(sampleInput, "2026-05-15T10:30:00+09:00");

    expect(
      notificationMock.triggerReservationNotification,
    ).not.toHaveBeenCalled();
  });

  it("メール送信トリガが同期 throw しても update() は成功扱い", async () => {
    apiMock.updateReservation.mockResolvedValueOnce(sampleReservation);
    notificationMock.triggerReservationNotification.mockImplementationOnce(
      () => {
        throw new Error("notification boom");
      },
    );
    const { useUpdateBooking } = await import("./useUpdateBooking");
    const u = useUpdateBooking();

    const r = await u.update(sampleInput, "2026-05-15T10:30:00+09:00");

    expect(r).toEqual(sampleReservation);
    expect(u.error.value).toBeNull();
  });
});
