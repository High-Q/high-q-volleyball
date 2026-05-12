import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOtpMock = vi.fn();
const signOutMock = vi.fn();
const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({
    auth: {
      signInWithOtp: signInWithOtpMock,
      signOut: signOutMock,
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    value: { origin: "http://localhost:5173" },
    writable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendMagicLink", () => {
  it("login モード: shouldCreateUser=false で signInWithOtp を呼ぶ", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    const { sendMagicLink } = await import("./auth-client");
    await sendMagicLink("test@example.com", { shouldCreateUser: false });
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "test@example.com",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "http://localhost:5173/auth/callback",
      },
    });
  });

  it("signup モード: shouldCreateUser=true で signInWithOtp を呼ぶ", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    const { sendMagicLink } = await import("./auth-client");
    await sendMagicLink("new@example.com", { shouldCreateUser: true });
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "new@example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: "http://localhost:5173/auth/callback",
      },
    });
  });

  it("error が返ると throw する", async () => {
    signInWithOtpMock.mockResolvedValue({
      error: { message: "rate limit", status: 429 },
    });
    const { sendMagicLink } = await import("./auth-client");
    await expect(
      sendMagicLink("x@example.com", { shouldCreateUser: false }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("next を指定すると emailRedirectTo に ?next=<encoded> が含まれる (#229)", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    const { sendMagicLink } = await import("./auth-client");
    await sendMagicLink("a@example.com", {
      shouldCreateUser: false,
      next: "/events/abc-123",
    });
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "a@example.com",
      options: {
        shouldCreateUser: false,
        emailRedirectTo:
          "http://localhost:5173/auth/callback?next=%2Fevents%2Fabc-123",
      },
    });
  });

  it("next が null / 未指定なら emailRedirectTo は素のままになる (#229)", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    const { sendMagicLink } = await import("./auth-client");
    await sendMagicLink("a@example.com", {
      shouldCreateUser: false,
      next: null,
    });
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "a@example.com",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "http://localhost:5173/auth/callback",
      },
    });
  });
});

describe("signOut", () => {
  it("auth.signOut を呼ぶ", async () => {
    signOutMock.mockResolvedValue({ error: null });
    const { signOut } = await import("./auth-client");
    await signOut();
    expect(signOutMock).toHaveBeenCalled();
  });
});

describe("getSession", () => {
  it("session を返す", async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });
    const { getSession } = await import("./auth-client");
    const result = await getSession();
    expect(result).toEqual({ user: { id: "u1" } });
  });

  it("session なしで null を返す", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { getSession } = await import("./auth-client");
    expect(await getSession()).toBeNull();
  });
});

describe("onAuthStateChange", () => {
  it("subscription を返す", async () => {
    const fakeSub = { unsubscribe: vi.fn() };
    onAuthStateChangeMock.mockReturnValue({ data: { subscription: fakeSub } });
    const { onAuthStateChange } = await import("./auth-client");
    const result = onAuthStateChange(() => {});
    expect(result).toBe(fakeSub);
  });
});
