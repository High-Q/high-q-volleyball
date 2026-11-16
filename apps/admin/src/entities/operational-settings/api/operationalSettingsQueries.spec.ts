import { beforeEach, describe, expect, it, vi } from "vitest";
import { unsafeMemberId } from "@high-q/shared";

/**
 * operationalSettingsQueries の取得 / 更新 + エラー分類テスト。
 * モック方針は entities/announcement-template/api/announcementTemplateQueries.spec.ts を踏襲する。
 */

const builderResult = {
  data: null as unknown,
  error: null as unknown,
};

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    maybeSingle: vi.fn().mockImplementation(async () => ({
      data: builderResult.data,
      error: builderResult.error,
    })),
    then: undefined,
  };
  return builder;
}

let currentBuilder = makeBuilder();
const fromMock = vi.fn();

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({ from: fromMock }),
  _resetSupabaseForTest: () => {},
}));

const ADMIN_ID = "22222222-2222-4222-8222-222222222222";
const ROW = {
  member_registration_enabled: true,
  updated_at: "2026-11-15T00:00:00Z",
  updated_by: ADMIN_ID,
};

beforeEach(() => {
  vi.clearAllMocks();
  currentBuilder = makeBuilder();
  fromMock.mockReturnValue(currentBuilder);
  builderResult.data = null;
  builderResult.error = null;
});

describe("fetchOperationalSettings", () => {
  it("singleton 行を取得し camelCase に変換する", async () => {
    builderResult.data = ROW;
    const { fetchOperationalSettings } = await import("./operationalSettingsQueries");
    const result = await fetchOperationalSettings();
    expect(fromMock).toHaveBeenCalledWith("operational_settings");
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", true);
    expect(currentBuilder.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      value: {
        memberRegistrationEnabled: true,
        updatedAt: "2026-11-15T00:00:00Z",
        updatedBy: ADMIN_ID,
      },
    });
  });

  it("行が無いのは SERVER_ERROR（異常系）", async () => {
    builderResult.data = null;
    const { fetchOperationalSettings } = await import("./operationalSettingsQueries");
    const result = await fetchOperationalSettings();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SERVER_ERROR");
  });

  it("権限エラー (42501) は PERMISSION_DENIED", async () => {
    builderResult.error = { code: "42501", message: "permission denied" };
    const { fetchOperationalSettings } = await import("./operationalSettingsQueries");
    const result = await fetchOperationalSettings();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });

  it("通信失敗 (TypeError) は NETWORK_ERROR", async () => {
    currentBuilder.maybeSingle = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { fetchOperationalSettings } = await import("./operationalSettingsQueries");
    const result = await fetchOperationalSettings();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NETWORK_ERROR");
  });
});

describe("updateMemberRegistrationEnabled", () => {
  it("singleton 行を update し、更新後の行を返す", async () => {
    builderResult.data = { ...ROW, member_registration_enabled: false };
    const { updateMemberRegistrationEnabled } = await import("./operationalSettingsQueries");
    const result = await updateMemberRegistrationEnabled(false, unsafeMemberId(ADMIN_ID));
    expect(fromMock).toHaveBeenCalledWith("operational_settings");
    expect(currentBuilder.update).toHaveBeenCalledWith({
      member_registration_enabled: false,
      updated_by: ADMIN_ID,
    });
    expect(currentBuilder.eq).toHaveBeenCalledWith("id", true);
    expect(currentBuilder.single).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.memberRegistrationEnabled).toBe(false);
  });

  it("RLS 違反 (42501) は PERMISSION_DENIED", async () => {
    builderResult.error = {
      code: "42501",
      message: "new row violates row-level security policy",
    };
    const { updateMemberRegistrationEnabled } = await import("./operationalSettingsQueries");
    const result = await updateMemberRegistrationEnabled(false, unsafeMemberId(ADMIN_ID));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PERMISSION_DENIED");
  });

  it("その他のエラーは SERVER_ERROR", async () => {
    builderResult.error = { code: "XX000", message: "boom" };
    const { updateMemberRegistrationEnabled } = await import("./operationalSettingsQueries");
    const result = await updateMemberRegistrationEnabled(true, unsafeMemberId(ADMIN_ID));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SERVER_ERROR");
  });
});
