import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

const sendMagicLinkMock = vi.fn();

vi.mock("../api/auth-client", () => ({
  sendMagicLink: (...args: unknown[]) => sendMagicLinkMock(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSendMagicLink", () => {
  it("初期状態は idle", async () => {
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    expect(c.status.value).toBe("idle");
    expect(c.error.value).toBeNull();
  });

  it("空メールで invalid-email", async () => {
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    await c.send("", { shouldCreateUser: false });
    expect(sendMagicLinkMock).not.toHaveBeenCalled();
    expect(c.error.value).toBe("invalid-email");
  });

  it("形式不正で invalid-email", async () => {
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    await c.send("not-email", { shouldCreateUser: false });
    expect(c.error.value).toBe("invalid-email");
  });

  it("login モード: shouldCreateUser=false で API を呼ぶ", async () => {
    sendMagicLinkMock.mockResolvedValue(undefined);
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    await c.send("a@example.com", { shouldCreateUser: false });
    expect(sendMagicLinkMock).toHaveBeenCalledWith("a@example.com", {
      shouldCreateUser: false,
    });
    expect(c.status.value).toBe("success");
  });

  it("signup モード: shouldCreateUser=true で API を呼ぶ", async () => {
    sendMagicLinkMock.mockResolvedValue(undefined);
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    await c.send("b@example.com", { shouldCreateUser: true });
    expect(sendMagicLinkMock).toHaveBeenCalledWith("b@example.com", {
      shouldCreateUser: true,
    });
  });

  it("loading 中の状態を観測できる", async () => {
    let resolve!: () => void;
    sendMagicLinkMock.mockImplementation(
      () => new Promise<void>((r) => (resolve = r)),
    );
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    const p = c.send("x@example.com", { shouldCreateUser: false });
    await nextTick();
    expect(c.status.value).toBe("loading");
    resolve();
    await p;
    expect(c.status.value).toBe("success");
  });

  it("rate-limit エラー", async () => {
    sendMagicLinkMock.mockRejectedValue({
      status: 429,
      code: "over_email_send_rate_limit",
      message: "rate limit exceeded",
    });
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    await c.send("x@example.com", { shouldCreateUser: false });
    expect(c.error.value).toBe("rate-limit");
  });

  it("network エラー", async () => {
    sendMagicLinkMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    await c.send("x@example.com", { shouldCreateUser: false });
    expect(c.error.value).toBe("network");
  });

  it("unknown エラー（その他）", async () => {
    sendMagicLinkMock.mockRejectedValue({ message: "weird" });
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    await c.send("x@example.com", { shouldCreateUser: false });
    expect(c.error.value).toBe("unknown");
  });

  it("reset() で状態がクリアされる", async () => {
    sendMagicLinkMock.mockResolvedValue(undefined);
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();
    await c.send("a@example.com", { shouldCreateUser: false });
    c.reset();
    expect(c.status.value).toBe("idle");
    expect(c.error.value).toBeNull();
    expect(c.submittedEmail.value).toBe("");
  });
});
