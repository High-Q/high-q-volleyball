import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeMemberId } from "@high-q/shared";

const apiMock = {
  updateMyExperienceLevel: vi.fn(),
};

const sessionRefresh = vi.fn();

vi.mock("../api/updateMyExperienceLevel", () => ({
  updateMyExperienceLevel: (...args: unknown[]) =>
    apiMock.updateMyExperienceLevel(...args),
}));

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({ refresh: sessionRefresh }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useLevelEdit", () => {
  const memberId = unsafeMemberId(
    "00000000-0000-0000-0000-000000000001",
  );

  it("成功で UPDATE 発行 + session.refresh() 呼び出し", async () => {
    apiMock.updateMyExperienceLevel.mockResolvedValueOnce("intermediate");
    sessionRefresh.mockResolvedValueOnce(undefined);
    const { useLevelEdit } = await import("./useLevelEdit");
    const handle = useLevelEdit();
    const ok = await handle.save(memberId, "intermediate");
    expect(ok).toBe(true);
    expect(apiMock.updateMyExperienceLevel).toHaveBeenCalledWith(
      memberId,
      "intermediate",
    );
    expect(sessionRefresh).toHaveBeenCalledOnce();
    expect(handle.error.value).toBeNull();
  });

  it("失敗時はエラーメッセージを保持し false を返す (呼び出し側がロールバック)", async () => {
    apiMock.updateMyExperienceLevel.mockRejectedValueOnce(
      new Error("RLS denied"),
    );
    const { useLevelEdit } = await import("./useLevelEdit");
    const handle = useLevelEdit();
    const ok = await handle.save(memberId, "intermediate");
    expect(ok).toBe(false);
    expect(handle.error.value).toBe("RLS denied");
    expect(sessionRefresh).not.toHaveBeenCalled();
  });

  it("並行呼び出しは 2 回目を無視 (二重保存防止)", async () => {
    apiMock.updateMyExperienceLevel.mockImplementation(
      () => new Promise(() => {}), // never resolves
    );
    const { useLevelEdit } = await import("./useLevelEdit");
    const handle = useLevelEdit();
    void handle.save(memberId, "intermediate");
    const second = await handle.save(memberId, "experienced");
    expect(second).toBe(false);
    expect(apiMock.updateMyExperienceLevel).toHaveBeenCalledOnce();
  });
});

