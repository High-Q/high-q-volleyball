import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberId } from "@high-q/shared";

const supabaseMock = {
  from: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

const MEMBER_ID = "00000000-0000-0000-0000-000000000001" as unknown as MemberId;
const ADMIN_ID = "00000000-0000-0000-0000-00000000admin" as unknown as MemberId;

function setupSelectMock(profileValue: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { profile: profileValue },
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, maybeSingle };
}

function setupUpdateMock(error: { message: string } | null = null) {
  const eq = vi.fn().mockResolvedValue({ error });
  const update = vi.fn(() => ({ eq }));
  return { update, eq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createCorrectionRequest", () => {
  it("空 message は INVALID_MESSAGE で UPDATE 発行なし", async () => {
    const { createCorrectionRequest } = await import("./createCorrectionRequest");
    const result = await createCorrectionRequest({
      memberId: MEMBER_ID,
      adminMemberId: ADMIN_ID,
      field: "birthday",
      message: "   ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_MESSAGE");
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("501 文字以上は INVALID_MESSAGE", async () => {
    const { createCorrectionRequest } = await import("./createCorrectionRequest");
    const result = await createCorrectionRequest({
      memberId: MEMBER_ID,
      adminMemberId: ADMIN_ID,
      field: "birthday",
      message: "a".repeat(501),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_MESSAGE");
  });

  it("会員不在で MEMBER_NOT_FOUND", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
    });
    const { createCorrectionRequest } = await import("./createCorrectionRequest");
    const result = await createCorrectionRequest({
      memberId: MEMBER_ID,
      adminMemberId: ADMIN_ID,
      field: "birthday",
      message: "本人確認書類と一致しません",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("MEMBER_NOT_FOUND");
  });

  it("同 field の既存エントリがあれば ALREADY_EXISTS", async () => {
    const selectChain = setupSelectMock({
      correction_requests: [
        {
          field: "birthday",
          message: "前回理由",
          requested_at: "2026-05-22T00:00:00.000Z",
          requested_by: ADMIN_ID,
        },
      ],
    });
    supabaseMock.from.mockReturnValueOnce({ select: selectChain.select });
    const { createCorrectionRequest } = await import("./createCorrectionRequest");
    const result = await createCorrectionRequest({
      memberId: MEMBER_ID,
      adminMemberId: ADMIN_ID,
      field: "birthday",
      message: "再度確認",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("ALREADY_EXISTS");
    expect(supabaseMock.from).toHaveBeenCalledTimes(1); // SELECT のみ、UPDATE 未発行
  });

  it("正常系: 既存空配列に append、UPDATE 発行", async () => {
    const selectChain = setupSelectMock({});
    const updateChain = setupUpdateMock();
    supabaseMock.from
      .mockReturnValueOnce({ select: selectChain.select })
      .mockReturnValueOnce({ update: updateChain.update });

    const { createCorrectionRequest } = await import("./createCorrectionRequest");
    const result = await createCorrectionRequest({
      memberId: MEMBER_ID,
      adminMemberId: ADMIN_ID,
      field: "phone",
      message: "電話番号が古いようです",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.field).toBe("phone");
      expect(result.value.message).toBe("電話番号が古いようです");
      expect(result.value.requested_by).toBe(ADMIN_ID);
    }
    expect(updateChain.update).toHaveBeenCalledTimes(1);
    const updateArg = (updateChain.update.mock.calls as unknown as unknown[][])[0]?.[0] as
      | { profile: { correction_requests: unknown[] } }
      | undefined;
    expect(updateArg?.profile.correction_requests).toHaveLength(1);
  });

  it("既存他 field との共存", async () => {
    const selectChain = setupSelectMock({
      correction_requests: [
        {
          field: "display_name",
          message: "ローマ字→漢字",
          requested_at: "2026-05-22T00:00:00.000Z",
          requested_by: ADMIN_ID,
        },
      ],
    });
    const updateChain = setupUpdateMock();
    supabaseMock.from
      .mockReturnValueOnce({ select: selectChain.select })
      .mockReturnValueOnce({ update: updateChain.update });

    const { createCorrectionRequest } = await import("./createCorrectionRequest");
    const result = await createCorrectionRequest({
      memberId: MEMBER_ID,
      adminMemberId: ADMIN_ID,
      field: "birthday",
      message: "本人確認書類と不一致",
    });
    expect(result.ok).toBe(true);
    const updateArg = (updateChain.update.mock.calls as unknown as unknown[][])[0]?.[0] as
      | { profile: { correction_requests: unknown[] } }
      | undefined;
    expect(updateArg?.profile.correction_requests).toHaveLength(2);
  });

  it("既存プロフィールの他キーを保持", async () => {
    const selectChain = setupSelectMock({
      signup_completed: true,
      terms_agreed_at: "2026-01-01",
    });
    const updateChain = setupUpdateMock();
    supabaseMock.from
      .mockReturnValueOnce({ select: selectChain.select })
      .mockReturnValueOnce({ update: updateChain.update });

    const { createCorrectionRequest } = await import("./createCorrectionRequest");
    await createCorrectionRequest({
      memberId: MEMBER_ID,
      adminMemberId: ADMIN_ID,
      field: "phone",
      message: "再確認",
    });
    const updateArg = (updateChain.update.mock.calls as unknown as unknown[][])[0]?.[0] as
      | { profile: Record<string, unknown> }
      | undefined;
    expect(updateArg?.profile.signup_completed).toBe(true);
    expect(updateArg?.profile.terms_agreed_at).toBe("2026-01-01");
  });
});
