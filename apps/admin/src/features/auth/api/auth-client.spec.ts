import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOtpMock = vi.fn();
const signOutMock = vi.fn();
const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const rpcMock = vi.fn();
const mfaEnrollMock = vi.fn();
const mfaChallengeMock = vi.fn();
const mfaVerifyMock = vi.fn();
const mfaListFactorsMock = vi.fn();
const mfaGetAalMock = vi.fn();

const supabaseClient = {
  auth: {
    signInWithOtp: signInWithOtpMock,
    signOut: signOutMock,
    getSession: getSessionMock,
    onAuthStateChange: onAuthStateChangeMock,
    mfa: {
      enroll: mfaEnrollMock,
      challenge: mfaChallengeMock,
      verify: mfaVerifyMock,
      listFactors: mfaListFactorsMock,
      getAuthenticatorAssuranceLevel: mfaGetAalMock,
    },
  },
  rpc: rpcMock,
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseClient,
  _resetSupabaseForTest: () => {},
}));

const ORIGINAL_LOCATION = window.location;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...ORIGINAL_LOCATION, origin: "https://admin.example.test" },
  });
});

describe("auth-client", () => {
  it("sendMagicLink は signInWithOtp を shouldCreateUser:false + emailRedirectTo で呼ぶ", async () => {
    signInWithOtpMock.mockResolvedValue({ data: {}, error: null });
    const { sendMagicLink } = await import("./auth-client");

    await sendMagicLink("owner@high-q.club");

    expect(signInWithOtpMock).toHaveBeenCalledTimes(1);
    expect(signInWithOtpMock).toHaveBeenCalledWith({
      email: "owner@high-q.club",
      options: {
        shouldCreateUser: false,
        emailRedirectTo: "https://admin.example.test/auth/callback",
      },
    });
  });

  it("checkIsAdmin は rpc('is_admin') を呼んで boolean を返す", async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    const { checkIsAdmin } = await import("./auth-client");

    const result = await checkIsAdmin();

    expect(rpcMock).toHaveBeenCalledWith("is_admin");
    expect(result).toBe(true);
  });

  it("checkIsAdmin は data が null のとき false を返す", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const { checkIsAdmin } = await import("./auth-client");

    const result = await checkIsAdmin();

    expect(result).toBe(false);
  });

  it("signOut は auth.signOut を呼ぶ", async () => {
    signOutMock.mockResolvedValue({ error: null });
    const { signOut } = await import("./auth-client");

    await signOut();

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("getSession は現在の session を返す", async () => {
    const session = { user: { id: "u1" }, access_token: "t" };
    getSessionMock.mockResolvedValue({ data: { session }, error: null });
    const { getSession } = await import("./auth-client");

    const result = await getSession();

    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(result).toBe(session);
  });

  it("getSession は data.session が null なら null を返す", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });
    const { getSession } = await import("./auth-client");

    const result = await getSession();

    expect(result).toBeNull();
  });

  it("onAuthStateChange は SDK の subscribe を返す", async () => {
    const subscription = { unsubscribe: vi.fn() };
    onAuthStateChangeMock.mockReturnValue({ data: { subscription } });
    const { onAuthStateChange } = await import("./auth-client");

    const cb = vi.fn();
    const ret = onAuthStateChange(cb);

    expect(onAuthStateChangeMock).toHaveBeenCalledWith(cb);
    expect(ret).toBe(subscription);
  });

  it("getAal は mfa.getAuthenticatorAssuranceLevel を呼ぶ", async () => {
    mfaGetAalMock.mockResolvedValue({
      data: { currentLevel: "aal2", nextLevel: "aal2" },
      error: null,
    });
    const { getAal } = await import("./auth-client");

    const result = await getAal();

    expect(mfaGetAalMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ currentLevel: "aal2", nextLevel: "aal2" });
  });

  it("listMfaFactors は mfa.listFactors の totp を返す", async () => {
    const totp = [{ id: "f1", status: "verified" }];
    mfaListFactorsMock.mockResolvedValue({
      data: { totp, all: totp },
      error: null,
    });
    const { listMfaFactors } = await import("./auth-client");

    const result = await listMfaFactors();

    expect(mfaListFactorsMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual(totp);
  });

  it("enrollTotp は mfa.enroll を factorType:totp で呼ぶ", async () => {
    mfaEnrollMock.mockResolvedValue({
      data: { id: "f1", totp: { qr_code: "<svg/>", secret: "S", uri: "otpauth://" } },
      error: null,
    });
    const { enrollTotp } = await import("./auth-client");

    const result = await enrollTotp();

    expect(mfaEnrollMock).toHaveBeenCalledWith({ factorType: "totp" });
    expect(result.factorId).toBe("f1");
    expect(result.qrCode).toBe("<svg/>");
    expect(result.secret).toBe("S");
    expect(result.uri).toBe("otpauth://");
  });

  it("challengeMfa は mfa.challenge を factorId 付きで呼ぶ", async () => {
    mfaChallengeMock.mockResolvedValue({
      data: { id: "ch1" },
      error: null,
    });
    const { challengeMfa } = await import("./auth-client");

    const result = await challengeMfa("f1");

    expect(mfaChallengeMock).toHaveBeenCalledWith({ factorId: "f1" });
    expect(result).toBe("ch1");
  });

  it("verifyMfa は mfa.verify を factorId/challengeId/code 付きで呼ぶ", async () => {
    mfaVerifyMock.mockResolvedValue({ data: {}, error: null });
    const { verifyMfa } = await import("./auth-client");

    await verifyMfa("f1", "ch1", "123456");

    expect(mfaVerifyMock).toHaveBeenCalledWith({
      factorId: "f1",
      challengeId: "ch1",
      code: "123456",
    });
  });

  it("verifyMfa は API がエラーを返したら投げる", async () => {
    mfaVerifyMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid code", status: 400 },
    });
    const { verifyMfa } = await import("./auth-client");

    await expect(verifyMfa("f1", "ch1", "000000")).rejects.toMatchObject({
      message: "Invalid code",
    });
  });
});
