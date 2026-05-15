import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = {
  from: vi.fn(),
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseMock,
}));

const UID = "00000000-0000-0000-0000-000000000001";

const memberRow = {
  id: UID,
  email: "test@example.com",
  display_name: "test",
  nickname: "ミサキ",
  birthday: "1995-03-15",
  phone: "090-1234-5678",
  experience_level: "beginner",
  role: "member",
  profile: { signup_completed: true, terms_agreed_at: "2026-05-02T00:00:00Z" },
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchMyMember", () => {
  it("members から自分の行を SELECT して Member 型に変換して返す", async () => {
    const single = vi.fn().mockResolvedValue({ data: memberRow, error: null });
    const eq = vi.fn(() => ({ maybeSingle: single }));
    const select = vi.fn(() => ({ eq }));
    supabaseMock.from.mockReturnValue({ select });

    const { fetchMyMember } = await import("./member-client");
    const result = await fetchMyMember(UID);

    expect(supabaseMock.from).toHaveBeenCalledWith("members");
    // #150: admin 専用列 admin_note を取得しないため明示列指定 SELECT を使う
    expect(select).toHaveBeenCalledWith(
      expect.stringContaining("display_name"),
    );
    expect(select).not.toHaveBeenCalledWith("*");
    expect(select).not.toHaveBeenCalledWith(
      expect.stringContaining("admin_note"),
    );
    expect(eq).toHaveBeenCalledWith("id", UID);
    expect(result?.id).toBe(UID);
    expect(result?.displayName).toBe("test");
    expect(result?.nickname).toBe("ミサキ");
    expect(result?.profile.signup_completed).toBe(true);
  });

  it("nickname が NULL の行を Member 型に変換すると null として返す", async () => {
    const single = vi.fn().mockResolvedValue({
      data: { ...memberRow, nickname: null },
      error: null,
    });
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: single })) })),
    });

    const { fetchMyMember } = await import("./member-client");
    const result = await fetchMyMember(UID);
    expect(result?.nickname).toBeNull();
  });

  it("行が無い場合は null を返す", async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: null });
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: single })) })),
    });

    const { fetchMyMember } = await import("./member-client");
    expect(await fetchMyMember(UID)).toBeNull();
  });

  it("エラー時に throw する", async () => {
    const single = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "boom" } });
    supabaseMock.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: single })) })),
    });

    const { fetchMyMember } = await import("./member-client");
    await expect(fetchMyMember(UID)).rejects.toMatchObject({ message: "boom" });
  });
});

describe("updateMyMember", () => {
  it("更新前 SELECT → profile マージ → UPDATE の順で呼ぶ + 既存キーを保持", async () => {
    // Step 1: SELECT profile - returns existing keys
    const selectMaybeSingle = vi.fn().mockResolvedValue({
      data: { profile: { existing_key: "preserved", signup_completed: false } },
      error: null,
    });
    const selectEq = vi.fn(() => ({ maybeSingle: selectMaybeSingle }));
    const selectFn = vi.fn(() => ({ eq: selectEq }));

    // Step 2: UPDATE call
    const updateSingle = vi.fn().mockResolvedValue({
      data: memberRow,
      error: null,
    });
    const updateSelect = vi.fn(() => ({ single: updateSingle }));
    const updateEq = vi.fn(() => ({ select: updateSelect }));
    const updateFn = vi.fn(() => ({ eq: updateEq }));

    // First .from() call returns select, second returns update
    let callCount = 0;
    supabaseMock.from.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return { select: selectFn };
      return { update: updateFn };
    });

    const { updateMyMember } = await import("./member-client");
    await updateMyMember(UID, {
      displayName: "新しい名前",
      nickname: "ミサキ",
      birthday: "1995-03-15",
      phone: "090-1234-5678",
      experienceLevel: "beginner",
      termsAgreedAt: "2026-05-02T10:00:00Z",
    });

    expect(supabaseMock.from).toHaveBeenCalledTimes(2);
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: "新しい名前",
        nickname: "ミサキ",
        profile: expect.objectContaining({
          existing_key: "preserved",
          signup_completed: true,
          terms_agreed_at: "2026-05-02T10:00:00Z",
        }),
      }),
    );
  });

  it("既存 profile が無い場合も signup_completed: true で UPDATE する", async () => {
    const selectMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { profile: null }, error: null });
    const updateSingle = vi
      .fn()
      .mockResolvedValue({ data: memberRow, error: null });
    const updateFn = vi.fn(() => ({
      eq: vi.fn(() => ({ select: vi.fn(() => ({ single: updateSingle })) })),
    }));

    let callCount = 0;
    supabaseMock.from.mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle: selectMaybeSingle })),
          })),
        };
      }
      return { update: updateFn };
    });

    const { updateMyMember } = await import("./member-client");
    await updateMyMember(UID, {
      displayName: "x",
      nickname: null,
      birthday: "2000-01-01",
      phone: "090-0000-0000",
      experienceLevel: "intermediate",
      termsAgreedAt: "2026-05-02T00:00:00Z",
    });

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        nickname: null,
        profile: { signup_completed: true, terms_agreed_at: "2026-05-02T00:00:00Z" },
      }),
    );
  });
});
