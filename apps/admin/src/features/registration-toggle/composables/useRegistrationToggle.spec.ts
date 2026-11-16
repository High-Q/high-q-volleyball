import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { ok, err, unsafeMemberId } from "@high-q/shared";

/**
 * useRegistrationToggle の状態遷移テスト。
 * entities/operational-settings と useToast をモックする。
 */

const fetchMock = vi.fn();
const updateMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/entities/operational-settings", () => ({
  fetchOperationalSettings: () => fetchMock(),
  updateMemberRegistrationEnabled: (enabled: boolean, by: unknown) =>
    updateMock(enabled, by),
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const ADMIN_ID = "22222222-2222-4222-8222-222222222222";

async function makeToggle(adminId: string | null = ADMIN_ID) {
  const { useRegistrationToggle } = await import("./useRegistrationToggle");
  const idRef = ref(adminId === null ? null : unsafeMemberId(adminId));
  return useRegistrationToggle(idRef);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("load", () => {
  it("取得成功で enabled を反映し ready", async () => {
    fetchMock.mockResolvedValue(
      ok({ memberRegistrationEnabled: false, updatedAt: "2026-11-15T00:00:00Z", updatedBy: null }),
    );
    const t = await makeToggle();
    await t.load();
    expect(t.status.value).toBe("ready");
    expect(t.enabled.value).toBe(false);
    expect(t.updatedAt.value).toBe("2026-11-15T00:00:00Z");
  });

  it("取得失敗で error", async () => {
    fetchMock.mockResolvedValue(err({ code: "SERVER_ERROR", message: "boom" }));
    const t = await makeToggle();
    await t.load();
    expect(t.status.value).toBe("error");
  });
});

describe("persist", () => {
  it("成功で enabled を確定し成功トースト（停止）", async () => {
    updateMock.mockResolvedValue(
      ok({ memberRegistrationEnabled: false, updatedAt: "2026-11-15T01:00:00Z", updatedBy: ADMIN_ID }),
    );
    const t = await makeToggle();
    const okResult = await t.persist(false);
    expect(okResult).toBe(true);
    expect(updateMock).toHaveBeenCalledWith(false, expect.anything());
    expect(t.enabled.value).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "新規会員登録を停止しました" }),
    );
  });

  it("成功で成功トースト（再開）", async () => {
    updateMock.mockResolvedValue(
      ok({ memberRegistrationEnabled: true, updatedAt: "2026-11-15T02:00:00Z", updatedBy: ADMIN_ID }),
    );
    const t = await makeToggle();
    await t.persist(true);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "新規会員登録を再開しました" }),
    );
  });

  it("失敗で enabled を変えず destructive トースト", async () => {
    updateMock.mockResolvedValue(err({ code: "SERVER_ERROR", message: "boom" }));
    const t = await makeToggle();
    t.enabled.value = true;
    const result = await t.persist(false);
    expect(result).toBe(false);
    expect(t.enabled.value).toBe(true);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });

  it("admin 不明なら update を呼ばず失敗", async () => {
    const t = await makeToggle(null);
    const result = await t.persist(false);
    expect(result).toBe(false);
    expect(updateMock).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });
});
