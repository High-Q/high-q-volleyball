import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updateMock = vi.fn();
vi.mock("@/entities/member", async () => {
  const actual =
    await vi.importActual<typeof import("@/entities/member")>("@/entities/member");
  return { ...actual, updateMyMember: (...a: unknown[]) => updateMock(...a) };
});

const refreshMock = vi.fn();
const sessionState = {
  session: { value: { user: { id: "uid-1" } } as { user: { id: string } } | null },
  refresh: refreshMock,
};
vi.mock("./useAuthSession", () => ({
  useAuthSession: () => sessionState,
}));

const validForm = {
  display_name: "田中 美咲",
  birthday: "1995-03-15",
  phone: "090-1234-5678",
  experience_level: "beginner",
  terms_agreed: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionState.session.value = { user: { id: "uid-1" } };
  refreshMock.mockResolvedValue(undefined);
  updateMock.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCompleteProfile", () => {
  it("利用規約同意なしで validation エラー", async () => {
    const { useCompleteProfile } = await import("./useCompleteProfile");
    const c = useCompleteProfile();
    await c.submit({ ...validForm, terms_agreed: false });
    expect(c.error.value).toBe("validation");
    expect(c.fieldErrors.value.terms).toMatch(/同意/);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("氏名空で validation エラー", async () => {
    const { useCompleteProfile } = await import("./useCompleteProfile");
    const c = useCompleteProfile();
    await c.submit({ ...validForm, display_name: "" });
    expect(c.fieldErrors.value.display_name).toBeTruthy();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("電話番号空で validation エラー", async () => {
    const { useCompleteProfile } = await import("./useCompleteProfile");
    const c = useCompleteProfile();
    await c.submit({ ...validForm, phone: "" });
    expect(c.fieldErrors.value.phone).toMatch(/電話番号/);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("成功時に updateMyMember + session.refresh を呼ぶ", async () => {
    const { useCompleteProfile } = await import("./useCompleteProfile");
    const c = useCompleteProfile();
    await c.submit(validForm);
    expect(updateMock).toHaveBeenCalledWith("uid-1", {
      displayName: "田中 美咲",
      birthday: "1995-03-15",
      phone: "090-1234-5678",
      experienceLevel: "beginner",
      termsAgreedAt: expect.any(String),
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(c.status.value).toBe("success");
  });

  it("session が無いとエラー (起動順異常)", async () => {
    sessionState.session.value = null;
    const { useCompleteProfile } = await import("./useCompleteProfile");
    const c = useCompleteProfile();
    await c.submit(validForm);
    expect(c.error.value).toBe("unknown");
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("UPDATE 失敗で network エラー", async () => {
    updateMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { useCompleteProfile } = await import("./useCompleteProfile");
    const c = useCompleteProfile();
    await c.submit(validForm);
    expect(c.status.value).toBe("error");
    expect(c.error.value).toBe("network");
  });
});
