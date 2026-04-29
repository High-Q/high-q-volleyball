import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listMfaFactorsMock = vi.fn();
const challengeMfaMock = vi.fn();
const verifyMfaMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("../api/auth-client", () => ({
  listMfaFactors: () => listMfaFactorsMock(),
  challengeMfa: (factorId: string) => challengeMfaMock(factorId),
  verifyMfa: (f: string, c: string, code: string) =>
    verifyMfaMock(f, c, code),
}));

vi.mock("./useAuthSession", () => ({
  useAuthSession: () => ({ refresh: refreshMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMfaChallenge", () => {
  it("初期状態は idle", async () => {
    const { useMfaChallenge } = await import("./useMfaChallenge");
    const c = useMfaChallenge();

    expect(c.status.value).toBe("idle");
    expect(c.error.value).toBeNull();
  });

  it("start() で verified factor の challengeMfa が呼ばれ awaiting-code に遷移", async () => {
    listMfaFactorsMock.mockResolvedValue([
      { id: "f1", status: "verified" },
    ]);
    challengeMfaMock.mockResolvedValue("ch1");

    const { useMfaChallenge } = await import("./useMfaChallenge");
    const c = useMfaChallenge();

    await c.start();

    expect(listMfaFactorsMock).toHaveBeenCalled();
    expect(challengeMfaMock).toHaveBeenCalledWith("f1");
    expect(c.status.value).toBe("awaiting-code");
  });

  it("verified factor が無いと error=no-factor", async () => {
    listMfaFactorsMock.mockResolvedValue([
      { id: "f1", status: "unverified" },
    ]);

    const { useMfaChallenge } = await import("./useMfaChallenge");
    const c = useMfaChallenge();

    await c.start();

    expect(challengeMfaMock).not.toHaveBeenCalled();
    expect(c.status.value).toBe("error");
    expect(c.error.value).toBe("no-factor");
  });

  it("submitCode で verifyMfa が呼ばれ success + refresh", async () => {
    listMfaFactorsMock.mockResolvedValue([
      { id: "f1", status: "verified" },
    ]);
    challengeMfaMock.mockResolvedValue("ch1");
    verifyMfaMock.mockResolvedValue(undefined);
    refreshMock.mockResolvedValue(undefined);

    const { useMfaChallenge } = await import("./useMfaChallenge");
    const c = useMfaChallenge();
    await c.start();
    await c.submitCode("123456");

    expect(verifyMfaMock).toHaveBeenCalledWith("f1", "ch1", "123456");
    expect(refreshMock).toHaveBeenCalled();
    expect(c.status.value).toBe("success");
  });

  it("誤コードで invalid-code, awaiting-code に戻り再入力可", async () => {
    listMfaFactorsMock.mockResolvedValue([
      { id: "f1", status: "verified" },
    ]);
    challengeMfaMock.mockResolvedValue("ch1");
    verifyMfaMock.mockRejectedValue({ message: "Invalid TOTP code", status: 400 });

    const { useMfaChallenge } = await import("./useMfaChallenge");
    const c = useMfaChallenge();
    await c.start();
    await c.submitCode("000000");

    expect(c.status.value).toBe("awaiting-code");
    expect(c.error.value).toBe("invalid-code");
  });

  it("listMfaFactors のネットワークエラーは error=network", async () => {
    listMfaFactorsMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const { useMfaChallenge } = await import("./useMfaChallenge");
    const c = useMfaChallenge();
    await c.start();

    expect(c.status.value).toBe("error");
    expect(c.error.value).toBe("network");
  });

  it("submitCode を start 前に呼ぶと no-factor", async () => {
    const { useMfaChallenge } = await import("./useMfaChallenge");
    const c = useMfaChallenge();

    await c.submitCode("123456");

    expect(c.error.value).toBe("no-factor");
  });

  it("reset で idle に戻る", async () => {
    listMfaFactorsMock.mockResolvedValue([
      { id: "f1", status: "verified" },
    ]);
    challengeMfaMock.mockResolvedValue("ch1");

    const { useMfaChallenge } = await import("./useMfaChallenge");
    const c = useMfaChallenge();
    await c.start();
    c.reset();

    expect(c.status.value).toBe("idle");
    expect(c.error.value).toBeNull();
  });
});
