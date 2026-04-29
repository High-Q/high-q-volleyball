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
  it("初期状態は idle で error は null", async () => {
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    expect(c.status.value).toBe("idle");
    expect(c.error.value).toBeNull();
    expect(c.submittedEmail.value).toBe("");
  });

  it("空メールは送信せず invalid-email エラー", async () => {
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    await c.send("");

    expect(sendMagicLinkMock).not.toHaveBeenCalled();
    expect(c.status.value).toBe("error");
    expect(c.error.value).toBe("invalid-email");
  });

  it("形式不正のメールは invalid-email", async () => {
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    await c.send("not-an-email");

    expect(sendMagicLinkMock).not.toHaveBeenCalled();
    expect(c.error.value).toBe("invalid-email");
  });

  it("成功時に status が success になり submittedEmail を保持する", async () => {
    sendMagicLinkMock.mockResolvedValue(undefined);
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    await c.send("owner@high-q.club");

    expect(sendMagicLinkMock).toHaveBeenCalledWith("owner@high-q.club");
    expect(c.status.value).toBe("success");
    expect(c.submittedEmail.value).toBe("owner@high-q.club");
    expect(c.error.value).toBeNull();
  });

  it("loading 中の状態を観測できる", async () => {
    let resolve!: () => void;
    sendMagicLinkMock.mockImplementation(
      () => new Promise<void>((r) => (resolve = r)),
    );
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    const promise = c.send("owner@high-q.club");
    await nextTick();
    expect(c.status.value).toBe("loading");

    resolve();
    await promise;
    expect(c.status.value).toBe("success");
  });

  it("レートリミットエラーは rate-limit に変換される", async () => {
    sendMagicLinkMock.mockRejectedValue({
      message: "Email rate limit exceeded",
      status: 429,
    });
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    await c.send("owner@high-q.club");

    expect(c.status.value).toBe("error");
    expect(c.error.value).toBe("rate-limit");
  });

  it("otp_disabled (shouldCreateUser:false で未登録メール) は not-registered に変換される", async () => {
    sendMagicLinkMock.mockRejectedValue({
      code: "otp_disabled",
      message: "Signups not allowed for otp",
      status: 422,
    });
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    await c.send("stranger@example.com");

    expect(c.error.value).toBe("not-registered");
  });

  it("ネットワークエラーは network に変換される", async () => {
    sendMagicLinkMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    await c.send("owner@high-q.club");

    expect(c.error.value).toBe("network");
  });

  it("その他のエラーは unknown", async () => {
    sendMagicLinkMock.mockRejectedValue(new Error("boom"));
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    await c.send("owner@high-q.club");

    expect(c.status.value).toBe("error");
    expect(c.error.value).toBe("unknown");
  });

  it("reset で idle に戻り error と submittedEmail がクリアされる", async () => {
    sendMagicLinkMock.mockResolvedValue(undefined);
    const { useSendMagicLink } = await import("./useSendMagicLink");
    const c = useSendMagicLink();

    await c.send("owner@high-q.club");
    c.reset();

    expect(c.status.value).toBe("idle");
    expect(c.submittedEmail.value).toBe("");
    expect(c.error.value).toBeNull();
  });
});
