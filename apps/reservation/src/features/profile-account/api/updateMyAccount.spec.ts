import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemberId } from "@/entities/member";

const supabaseMock = {
  from: vi.fn(),
  auth: {
    updateUser: vi.fn(),
  },
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

const ADMIN_ID = "00000000-0000-0000-0000-00000000admin";

/**
 * #296 の各 mutation は `from('members')` を 2 回呼ぶ:
 *   1. SELECT profile（既存 correction_requests 取得用）
 *   2. UPDATE { field, profile }
 *
 * テストでは call index で SELECT/UPDATE を切り替えて mock し、UPDATE 引数を検証する。
 */
function mockSelectThenUpdate(
  profileValue: unknown,
  updateError: { message: string } | null = null,
) {
  const selectMaybeSingle = vi.fn().mockResolvedValue({
    data: { profile: profileValue },
    error: null,
  });
  const selectEq = vi.fn(() => ({ maybeSingle: selectMaybeSingle }));
  const selectFn = vi.fn(() => ({ eq: selectEq }));

  const updateEq = vi.fn().mockResolvedValue({ error: updateError });
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

describe("updateMyName", () => {
  it("姓空欄は createLastName が例外を投げ、SELECT/UPDATE 発行されない", async () => {
    const { updateMyName } = await import("./updateMyAccount");
    await expect(updateMyName(memberId, "  ", "美咲")).rejects.toThrow(
      /姓を入力してください/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("名空欄は createFirstName が例外を投げ、SELECT/UPDATE 発行されない", async () => {
    const { updateMyName } = await import("./updateMyAccount");
    await expect(updateMyName(memberId, "田中", "  ")).rejects.toThrow(
      /名を入力してください/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("正常値で姓・名 UPDATE + profile 同時更新 (display_name は指定しない)", async () => {
    const { updateMyName } = await import("./updateMyAccount");
    const { selectFn, updateFn } = mockSelectThenUpdate({});
    const result = await updateMyName(memberId, "  田中  ", "  美希  ");
    expect(result).toEqual({ lastName: "田中", firstName: "美希" });
    expect(selectFn).toHaveBeenCalledTimes(1);
    expect(updateFn).toHaveBeenCalledTimes(1);
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(arg.last_name).toBe("田中");
    expect(arg.first_name).toBe("美希");
    expect(arg).toHaveProperty("profile");
    expect(arg).not.toHaveProperty("display_name");
  });

  it("#296 last_name + first_name の correction_requests を同時消化", async () => {
    const { updateMyName } = await import("./updateMyAccount");
    const { updateFn } = mockSelectThenUpdate({
      signup_completed: true,
      correction_requests: [
        {
          field: "last_name",
          message: "ローマ字→漢字",
          requested_at: "2026-05-23T00:00:00Z",
          requested_by: ADMIN_ID,
        },
        {
          field: "first_name",
          message: "ローマ字→漢字",
          requested_at: "2026-05-23T00:00:00Z",
          requested_by: ADMIN_ID,
        },
        {
          field: "birthday",
          message: "確認",
          requested_at: "2026-05-23T00:00:00Z",
          requested_by: ADMIN_ID,
        },
      ],
    });
    await updateMyName(memberId, "田中", "美希");
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as {
      profile: { correction_requests?: Array<{ field: string }> };
    };
    const remaining = arg.profile.correction_requests ?? [];
    expect(remaining.map((r) => r.field)).toEqual(["birthday"]);
  });
});

describe("updateMyNickname", () => {
  it("空文字は NULL に変換して UPDATE 発行", async () => {
    const { updateMyNickname } = await import("./updateMyAccount");
    const { updateFn } = mockSelectThenUpdate({});
    const result = await updateMyNickname(memberId, "");
    expect(result).toBeNull();
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(arg.nickname).toBeNull();
  });

  it("正常値で nickname UPDATE + profile 同時更新", async () => {
    const { updateMyNickname } = await import("./updateMyAccount");
    const { updateFn } = mockSelectThenUpdate({});
    await updateMyNickname(memberId, "ミサキ");
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(arg.nickname).toBe("ミサキ");
    expect(arg).toHaveProperty("profile");
  });

  it("文字種違反は createNickname が例外を投げる", async () => {
    const { updateMyNickname } = await import("./updateMyAccount");
    await expect(updateMyNickname(memberId, "たろ123")).rejects.toThrow(
      /日本語と英字のみ/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("#296 nickname の correction_request を消化", async () => {
    const { updateMyNickname } = await import("./updateMyAccount");
    const { updateFn } = mockSelectThenUpdate({
      correction_requests: [
        {
          field: "nickname",
          message: "再考",
          requested_at: "2026-05-23T00:00:00Z",
          requested_by: ADMIN_ID,
        },
      ],
    });
    await updateMyNickname(memberId, "ミサキ");
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as {
      profile: Record<string, unknown>;
    };
    expect(arg.profile).not.toHaveProperty("correction_requests");
  });
});

describe("updateMyPhone", () => {
  it("区切りなし入力は正規化して UPDATE 発行", async () => {
    const { updateMyPhone } = await import("./updateMyAccount");
    const { updateFn } = mockSelectThenUpdate({});
    await updateMyPhone(memberId, "09098765432");
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(arg.phone).toBe("090-9876-5432");
  });

  it("固定電話は createPhone が例外を投げる", async () => {
    const { updateMyPhone } = await import("./updateMyAccount");
    await expect(updateMyPhone(memberId, "03-1234-5678")).rejects.toThrow(
      /携帯電話番号/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("#296 phone の correction_request を消化", async () => {
    const { updateMyPhone } = await import("./updateMyAccount");
    const { updateFn } = mockSelectThenUpdate({
      correction_requests: [
        {
          field: "phone",
          message: "番号確認",
          requested_at: "2026-05-23T00:00:00Z",
          requested_by: ADMIN_ID,
        },
      ],
    });
    await updateMyPhone(memberId, "090-9876-5432");
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as {
      profile: Record<string, unknown>;
    };
    expect(arg.profile).not.toHaveProperty("correction_requests");
  });
});

describe("updateMyBirthday (#296 新規)", () => {
  it("正常な日付で UPDATE + profile 同時更新", async () => {
    const { updateMyBirthday } = await import("./updateMyAccount");
    const { updateFn } = mockSelectThenUpdate({});
    const result = await updateMyBirthday(memberId, "1995-03-15");
    expect(result).toBe("1995-03-15");
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as Record<string, unknown>;
    expect(arg.birthday).toBe("1995-03-15");
    expect(arg).toHaveProperty("profile");
  });

  it("未来日は createBirthday が例外を投げる", async () => {
    const { updateMyBirthday } = await import("./updateMyAccount");
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await expect(updateMyBirthday(memberId, future)).rejects.toThrow(
      /過去の日付/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("100 年より前は createBirthday が例外を投げる", async () => {
    const { updateMyBirthday } = await import("./updateMyAccount");
    await expect(updateMyBirthday(memberId, "1900-01-01")).rejects.toThrow(
      /生年月日/,
    );
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("birthday の correction_request を消化", async () => {
    const { updateMyBirthday } = await import("./updateMyAccount");
    const { updateFn } = mockSelectThenUpdate({
      correction_requests: [
        {
          field: "birthday",
          message: "本人確認書類と不一致",
          requested_at: "2026-05-23T00:00:00Z",
          requested_by: ADMIN_ID,
        },
      ],
    });
    await updateMyBirthday(memberId, "1995-03-15");
    const arg = ((updateFn.mock.calls as unknown as unknown[][])[0]?.[0] ?? {}) as {
      profile: Record<string, unknown>;
    };
    expect(arg.profile).not.toHaveProperty("correction_requests");
  });
});

describe("requestMyEmailChange", () => {
  it("空欄を弾く", async () => {
    const { requestMyEmailChange } = await import("./updateMyAccount");
    await expect(requestMyEmailChange("  ")).rejects.toThrow(
      /メールアドレスを入力してください/,
    );
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it("形式不正を弾く", async () => {
    const { requestMyEmailChange } = await import("./updateMyAccount");
    await expect(requestMyEmailChange("not-an-email")).rejects.toThrow(
      /形式/,
    );
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled();
  });

  it("正常値は supabase.auth.updateUser を呼び、members は触らない", async () => {
    supabaseMock.auth.updateUser.mockResolvedValueOnce({ error: null });
    const { requestMyEmailChange } = await import("./updateMyAccount");
    await requestMyEmailChange("new@example.com");
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({
      email: "new@example.com",
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("rate-limit エラーを日本語メッセージに変換", async () => {
    supabaseMock.auth.updateUser.mockResolvedValueOnce({
      error: { message: "Email rate limit exceeded" },
    });
    const { requestMyEmailChange } = await import("./updateMyAccount");
    await expect(
      requestMyEmailChange("new@example.com"),
    ).rejects.toThrow(/送信回数の上限/);
  });
});
