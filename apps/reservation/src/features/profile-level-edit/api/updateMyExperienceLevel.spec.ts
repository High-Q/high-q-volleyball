import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemberId } from "@/entities/member";

const supabaseMock = {
  from: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

const ADMIN_ID = "00000000-0000-0000-0000-00000000admin";

function mockSelectThenUpdate(profileValue: unknown) {
  const selectMaybeSingle = vi.fn().mockResolvedValue({
    data: { profile: profileValue },
    error: null,
  });
  const selectEq = vi.fn(() => ({ maybeSingle: selectMaybeSingle }));
  const selectFn = vi.fn(() => ({ eq: selectEq }));
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const updateFn = vi.fn(() => ({ eq: updateEq }));
  supabaseMock.from.mockImplementation(() => {
    const callCount = supabaseMock.from.mock.calls.length;
    return callCount === 1 ? { select: selectFn } : { update: updateFn };
  });
  return { selectFn, updateFn };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const memberId = createMemberId("00000000-0000-0000-0000-00000000ffff");

describe("updateMyExperienceLevel", () => {
  it("enum 外の値は createExperienceLevel が例外を投げる (SELECT/UPDATE 発行前)", async () => {
    const { updateMyExperienceLevel } = await import("./updateMyExperienceLevel");
    await expect(updateMyExperienceLevel(memberId, "unknown")).rejects.toThrow(
      /経験レベルが正しくありません/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("正常な enum で UPDATE + profile 同時更新", async () => {
    const { updateMyExperienceLevel } = await import("./updateMyExperienceLevel");
    const { updateFn } = mockSelectThenUpdate({});
    const result = await updateMyExperienceLevel(memberId, "intermediate");
    expect(result).toBe("intermediate");
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(arg.experience_level).toBe("intermediate");
    expect(arg).toHaveProperty("profile");
  });

  it("#296 experience_level の correction_request を消化", async () => {
    const { updateMyExperienceLevel } = await import("./updateMyExperienceLevel");
    const { updateFn } = mockSelectThenUpdate({
      correction_requests: [
        {
          field: "experience_level",
          message: "再評価",
          requested_at: "2026-05-23T00:00:00Z",
          requested_by: ADMIN_ID,
        },
        {
          field: "phone",
          message: "確認",
          requested_at: "2026-05-23T00:00:00Z",
          requested_by: ADMIN_ID,
        },
      ],
    });
    await updateMyExperienceLevel(memberId, "experienced");
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as {
      profile: { correction_requests?: Array<{ field: string }> };
    };
    // experience_level エントリのみ消化、phone は残る
    expect(arg.profile.correction_requests?.map((r) => r.field)).toEqual(["phone"]);
  });
});
