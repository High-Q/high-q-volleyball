import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("./supabase", () => ({
  getSupabase: () => ({
    auth: { getSession: getSessionMock },
    functions: { invoke: invokeMock },
  }),
  _resetSupabaseForTest: () => {},
}));

const VALID_INPUT = {
  eventId: "11111111-2222-3333-4444-555555555555",
  eventName: "金曜の夜練",
  startAtJst: "2026年5月22日 19:30〜21:30",
  venueName: "新宿スポーツセンター",
  snapshotRecipients: [
    {
      memberId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "alice@example.com",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  getSessionMock.mockResolvedValue({
    data: { session: { access_token: "valid-token" } },
  });
  invokeMock.mockResolvedValue({ data: { ok: true, sent: 1, failed: 0 }, error: null });
});

describe("triggerEventCancellationNotification", () => {
  it("正常系: send-event-cancellation-notification を呼ぶ", async () => {
    const { triggerEventCancellationNotification } = await import(
      "./event-cancellation-notification"
    );
    await triggerEventCancellationNotification(VALID_INPUT);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      "send-event-cancellation-notification",
      expect.objectContaining({
        body: expect.objectContaining({
          eventId: VALID_INPUT.eventId,
          eventName: VALID_INPUT.eventName,
          snapshotRecipients: VALID_INPUT.snapshotRecipients,
        }),
      }),
    );
  });

  it("organizerMessage が指定されたとき body に含まれる", async () => {
    const { triggerEventCancellationNotification } = await import(
      "./event-cancellation-notification"
    );
    await triggerEventCancellationNotification({
      ...VALID_INPUT,
      organizerMessage: "雨天中止",
    });
    expect(invokeMock).toHaveBeenCalledWith(
      "send-event-cancellation-notification",
      expect.objectContaining({
        body: expect.objectContaining({ organizerMessage: "雨天中止" }),
      }),
    );
  });

  it("organizerMessage 未指定のとき body から省く", async () => {
    const { triggerEventCancellationNotification } = await import(
      "./event-cancellation-notification"
    );
    await triggerEventCancellationNotification(VALID_INPUT);
    expect(invokeMock).toHaveBeenCalledTimes(1);
    const call = invokeMock.mock.calls[0] as
      | [string, { body: { organizerMessage?: string } }]
      | undefined;
    expect(call?.[1].body.organizerMessage).toBeUndefined();
  });

  it("session が無いとき invoke を呼ばずに return", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { triggerEventCancellationNotification } = await import(
      "./event-cancellation-notification"
    );
    await triggerEventCancellationNotification(VALID_INPUT);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("Edge Function が error を返しても throw しない", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { triggerEventCancellationNotification } = await import(
      "./event-cancellation-notification"
    );
    await expect(
      triggerEventCancellationNotification(VALID_INPUT),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("invoke 自体が throw しても throw しない", async () => {
    invokeMock.mockRejectedValue(new Error("network down"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { triggerEventCancellationNotification } = await import(
      "./event-cancellation-notification"
    );
    await expect(
      triggerEventCancellationNotification(VALID_INPUT),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("Edge Function が { ok: false } を返しても throw しない (warn ログのみ)", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: false, error: "mail-failed" },
      error: null,
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { triggerEventCancellationNotification } = await import(
      "./event-cancellation-notification"
    );
    await expect(
      triggerEventCancellationNotification(VALID_INPUT),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("部分失敗 (failed > 0) のとき warn ログを残す", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, sent: 1, failed: 1, total: 2 },
      error: null,
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { triggerEventCancellationNotification } = await import(
      "./event-cancellation-notification"
    );
    await triggerEventCancellationNotification(VALID_INPUT);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
