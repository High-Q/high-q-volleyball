import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberId } from "@high-q/shared";

const supabaseMock = {
  from: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

const MEMBER_ID = "00000000-0000-0000-0000-000000000001" as unknown as MemberId;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withdrawCorrectionRequest", () => {
  it("該当 field のエントリのみ削除", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        profile: {
          correction_requests: [
            {
              field: "birthday",
              message: "理由 A",
              requested_at: "2026-05-23T00:00:00.000Z",
              requested_by: "admin-1",
            },
            {
              field: "phone",
              message: "理由 B",
              requested_at: "2026-05-23T00:01:00.000Z",
              requested_by: "admin-1",
            },
          ],
        },
      },
      error: null,
    });
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));

    supabaseMock.from
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ update });

    const { withdrawCorrectionRequest } = await import(
      "./withdrawCorrectionRequest"
    );
    const result = await withdrawCorrectionRequest({
      memberId: MEMBER_ID,
      field: "birthday",
    });
    expect(result.ok).toBe(true);
    const updateArg = (update.mock.calls as unknown as unknown[][])[0]?.[0] as
      | { profile: { correction_requests?: unknown[] } }
      | undefined;
    expect(updateArg?.profile.correction_requests).toHaveLength(1);
  });

  it("最後のエントリ削除で correction_requests キーごと消える", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        profile: {
          signup_completed: true,
          correction_requests: [
            {
              field: "phone",
              message: "理由",
              requested_at: "2026-05-23T00:00:00.000Z",
              requested_by: "admin-1",
            },
          ],
        },
      },
      error: null,
    });
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));

    supabaseMock.from
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ update });

    const { withdrawCorrectionRequest } = await import(
      "./withdrawCorrectionRequest"
    );
    await withdrawCorrectionRequest({ memberId: MEMBER_ID, field: "phone" });
    const updateArg = (update.mock.calls as unknown as unknown[][])[0]?.[0] as
      | { profile: Record<string, unknown> }
      | undefined;
    expect(updateArg?.profile).not.toHaveProperty("correction_requests");
    expect(updateArg?.profile.signup_completed).toBe(true);
  });

  it("該当エントリが存在しなくても成功扱い (idempotent)", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { profile: {} },
      error: null,
    });
    const select = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));

    supabaseMock.from
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ update });

    const { withdrawCorrectionRequest } = await import(
      "./withdrawCorrectionRequest"
    );
    const result = await withdrawCorrectionRequest({
      memberId: MEMBER_ID,
      field: "birthday",
    });
    expect(result.ok).toBe(true);
  });

  it("会員不在で MEMBER_NOT_FOUND", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    supabaseMock.from.mockReturnValueOnce({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
    });

    const { withdrawCorrectionRequest } = await import(
      "./withdrawCorrectionRequest"
    );
    const result = await withdrawCorrectionRequest({
      memberId: MEMBER_ID,
      field: "birthday",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("MEMBER_NOT_FOUND");
  });
});
