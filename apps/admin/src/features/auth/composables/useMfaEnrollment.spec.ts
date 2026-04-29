import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

const enrollTotpMock = vi.fn();
const challengeMfaMock = vi.fn();
const verifyMfaMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("../api/auth-client", () => ({
  enrollTotp: () => enrollTotpMock(),
  challengeMfa: (factorId: string) => challengeMfaMock(factorId),
  verifyMfa: (f: string, c: string, code: string) =>
    verifyMfaMock(f, c, code),
}));

vi.mock("./useAuthSession", () => ({
  useAuthSession: () => ({
    refresh: refreshMock,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMfaEnrollment", () => {
  it("初期状態は idle", async () => {
    const { useMfaEnrollment } = await import("./useMfaEnrollment");
    const c = useMfaEnrollment();

    expect(c.status.value).toBe("idle");
    expect(c.error.value).toBeNull();
    expect(c.qrCode.value).toBe("");
    expect(c.secret.value).toBe("");
    expect(c.factorId.value).toBe("");
  });

  it("enroll() で enrollTotp が呼ばれ qrCode/secret/factorId をセット、awaiting-code に遷移", async () => {
    enrollTotpMock.mockResolvedValue({
      factorId: "f1",
      qrCode: "<svg/>",
      secret: "BASE32",
      uri: "otpauth://totp/...",
    });
    const { useMfaEnrollment } = await import("./useMfaEnrollment");
    const c = useMfaEnrollment();

    await c.enroll();

    expect(enrollTotpMock).toHaveBeenCalledTimes(1);
    expect(c.factorId.value).toBe("f1");
    expect(c.qrCode.value).toBe("<svg/>");
    expect(c.secret.value).toBe("BASE32");
    expect(c.status.value).toBe("awaiting-code");
  });

  it("enroll() のエラーは status=error で error=unknown", async () => {
    enrollTotpMock.mockRejectedValue(new Error("enroll failed"));
    const { useMfaEnrollment } = await import("./useMfaEnrollment");
    const c = useMfaEnrollment();

    await c.enroll();

    expect(c.status.value).toBe("error");
    expect(c.error.value).toBe("unknown");
  });

  it("submitCode で challenge → verify が順に呼ばれ success に遷移し refresh も呼ばれる", async () => {
    enrollTotpMock.mockResolvedValue({
      factorId: "f1",
      qrCode: "<svg/>",
      secret: "S",
      uri: "u",
    });
    challengeMfaMock.mockResolvedValue("ch1");
    verifyMfaMock.mockResolvedValue(undefined);
    refreshMock.mockResolvedValue(undefined);

    const { useMfaEnrollment } = await import("./useMfaEnrollment");
    const c = useMfaEnrollment();

    await c.enroll();
    await c.submitCode("123456");

    expect(challengeMfaMock).toHaveBeenCalledWith("f1");
    expect(verifyMfaMock).toHaveBeenCalledWith("f1", "ch1", "123456");
    expect(refreshMock).toHaveBeenCalled();
    expect(c.status.value).toBe("success");
  });

  it("verify エラー (invalid code) は error=invalid-code、再入力可", async () => {
    enrollTotpMock.mockResolvedValue({
      factorId: "f1",
      qrCode: "",
      secret: "",
      uri: "",
    });
    challengeMfaMock.mockResolvedValue("ch1");
    verifyMfaMock.mockRejectedValue({
      message: "Invalid TOTP code",
      status: 400,
    });

    const { useMfaEnrollment } = await import("./useMfaEnrollment");
    const c = useMfaEnrollment();

    await c.enroll();
    await c.submitCode("000000");

    expect(c.status.value).toBe("awaiting-code");
    expect(c.error.value).toBe("invalid-code");
  });

  it("verify エラー (network) は error=network", async () => {
    enrollTotpMock.mockResolvedValue({
      factorId: "f1",
      qrCode: "",
      secret: "",
      uri: "",
    });
    challengeMfaMock.mockResolvedValue("ch1");
    verifyMfaMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const { useMfaEnrollment } = await import("./useMfaEnrollment");
    const c = useMfaEnrollment();

    await c.enroll();
    await c.submitCode("123456");

    expect(c.error.value).toBe("network");
  });

  it("submitCode 中の verifying 状態を観測できる", async () => {
    enrollTotpMock.mockResolvedValue({
      factorId: "f1",
      qrCode: "",
      secret: "",
      uri: "",
    });
    challengeMfaMock.mockResolvedValue("ch1");
    let resolve!: () => void;
    verifyMfaMock.mockImplementation(
      () => new Promise<void>((r) => (resolve = r)),
    );

    const { useMfaEnrollment } = await import("./useMfaEnrollment");
    const c = useMfaEnrollment();
    await c.enroll();

    const p = c.submitCode("123456");
    await nextTick();
    expect(c.status.value).toBe("verifying");
    resolve();
    await p;
    expect(c.status.value).toBe("success");
  });

  it("reset で idle に戻る", async () => {
    enrollTotpMock.mockResolvedValue({
      factorId: "f1",
      qrCode: "",
      secret: "",
      uri: "",
    });
    const { useMfaEnrollment } = await import("./useMfaEnrollment");
    const c = useMfaEnrollment();

    await c.enroll();
    c.reset();

    expect(c.status.value).toBe("idle");
    expect(c.factorId.value).toBe("");
    expect(c.error.value).toBeNull();
  });
});
