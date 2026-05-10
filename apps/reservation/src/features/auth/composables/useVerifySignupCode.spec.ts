import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const verifyOtpMock = vi.fn();
const sessionRefreshMock = vi.fn(async () => {});

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({
    functions: { invoke: invokeMock },
    auth: {
      verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
    },
  }),
}));

vi.mock("./useAuthSession", () => ({
  useAuthSession: () => ({
    refresh: sessionRefreshMock,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useVerifySignupCode", () => {
  it("初期状態は idle", async () => {
    const { useVerifySignupCode } = await import("./useVerifySignupCode");
    const c = useVerifySignupCode();
    expect(c.status.value).toBe("idle");
    expect(c.errorCode.value).toBeNull();
  });

  it("コードが 6 桁数字でなければ validation で API は呼ばれない", async () => {
    const { useVerifySignupCode } = await import("./useVerifySignupCode");
    const c = useVerifySignupCode();
    const ok = await c.submit("rem@example.com", "12345");
    expect(ok).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(c.errorCode.value).toBe("validation");
  });

  it("成功で verifyOtp + session.refresh を呼び success 状態", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, tokenHash: "abc123", email: "rem@example.com" },
      error: null,
    });
    verifyOtpMock.mockResolvedValue({ error: null });
    const { useVerifySignupCode } = await import("./useVerifySignupCode");
    const c = useVerifySignupCode();
    const ok = await c.submit("rem@example.com", "123456");
    expect(ok).toBe(true);
    expect(c.status.value).toBe("success");
    expect(invokeMock).toHaveBeenCalledWith("verify-signup", {
      body: { email: "rem@example.com", code: "123456" },
    });
    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: "abc123",
      type: "magiclink",
    });
    expect(sessionRefreshMock).toHaveBeenCalled();
  });

  it("verifyOtp 失敗で errorCode='session-failed'", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, tokenHash: "abc123", email: "rem@example.com" },
      error: null,
    });
    verifyOtpMock.mockResolvedValue({ error: { message: "invalid token" } });
    const { useVerifySignupCode } = await import("./useVerifySignupCode");
    const c = useVerifySignupCode();
    const ok = await c.submit("rem@example.com", "123456");
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("session-failed");
  });

  it("コード誤入力（400 invalid-code）で remainingAttempts を保持", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: {
          json: async () => ({ error: "invalid-code", remainingAttempts: 3 }),
        },
      },
    });
    const { useVerifySignupCode } = await import("./useVerifySignupCode");
    const c = useVerifySignupCode();
    const ok = await c.submit("rem@example.com", "999999");
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("invalid-code");
    expect(c.remainingAttempts.value).toBe(3);
  });

  it("期限切れ（410 expired）で errorCode='expired'", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: { json: async () => ({ error: "expired" }) },
      },
    });
    const { useVerifySignupCode } = await import("./useVerifySignupCode");
    const c = useVerifySignupCode();
    const ok = await c.submit("rem@example.com", "123456");
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("expired");
  });

  it("試行回数上限（429 attempt-exceeded）で errorCode='attempt-exceeded'", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: { json: async () => ({ error: "attempt-exceeded" }) },
      },
    });
    const { useVerifySignupCode } = await import("./useVerifySignupCode");
    const c = useVerifySignupCode();
    const ok = await c.submit("rem@example.com", "123456");
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("attempt-exceeded");
  });

  it("not-found（404 セッション無し）で errorCode='not-found'", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: { json: async () => ({ error: "not-found" }) },
      },
    });
    const { useVerifySignupCode } = await import("./useVerifySignupCode");
    const c = useVerifySignupCode();
    const ok = await c.submit("rem@example.com", "123456");
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("not-found");
  });

  it("ネットワーク失敗で errorCode='network'", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "failed to fetch", context: undefined },
    });
    const { useVerifySignupCode } = await import("./useVerifySignupCode");
    const c = useVerifySignupCode();
    const ok = await c.submit("rem@example.com", "123456");
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("network");
  });
});
