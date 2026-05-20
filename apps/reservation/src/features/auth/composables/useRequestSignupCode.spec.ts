import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({
    functions: { invoke: invokeMock },
  }),
}));

const validForm = {
  email: "rem@example.com",
  // #281: 姓・名 2 フィールド
  last_name: "レム",
  first_name: "テスト",
  nickname: "レム",
  birthday: "1995-03-15",
  phone: "090-1234-5678",
  experience_level: "beginner",
  terms_agreed: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useRequestSignupCode", () => {
  it("初期状態は idle", async () => {
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    expect(c.status.value).toBe("idle");
    expect(c.errorCode.value).toBeNull();
    expect(c.fieldErrors.value).toEqual({});
  });

  it("利用規約同意なしで terms エラー（API は呼ばれない）", async () => {
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit({ ...validForm, terms_agreed: false });
    expect(ok).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(c.errorCode.value).toBe("validation");
    expect(c.fieldErrors.value.terms).toBeTruthy();
  });

  it("空メールで email エラー", async () => {
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit({ ...validForm, email: "" });
    expect(ok).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(c.fieldErrors.value.email).toBeTruthy();
  });

  it("形式不正メールで email エラー", async () => {
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit({ ...validForm, email: "not-an-email" });
    expect(ok).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(c.fieldErrors.value.email).toBeTruthy();
  });

  it("Smart constructor バリデーション（生年月日未来日）で field エラー", async () => {
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const ok = await c.submit({ ...validForm, birthday: future });
    expect(ok).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(c.fieldErrors.value.birthday).toBeTruthy();
  });

  it("成功で expiresAt をセットし success 状態 (#281: 姓・名 2 キーで送信)", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, expiresAt: "2026-05-11T11:00:00.000Z" },
      error: null,
    });
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit(validForm);
    expect(ok).toBe(true);
    expect(c.status.value).toBe("success");
    expect(c.expiresAt.value).toBe("2026-05-11T11:00:00.000Z");
    expect(invokeMock).toHaveBeenCalledWith("request-signup", {
      body: expect.objectContaining({
        email: "rem@example.com",
        last_name: "レム",
        first_name: "テスト",
        nickname: "レム",
        birthday: "1995-03-15",
        phone: "090-1234-5678",
        experience_level: "beginner",
      }),
    });
    // display_name は送信しない (Edge Function 側で last_name / first_name から復元)
    const body = invokeMock.mock.calls[0]?.[1]?.body ?? {};
    expect(body).not.toHaveProperty("display_name");
  });

  it("#281: 姓だけ入力で名空欄は last_name OK / first_name エラーになり API は呼ばれない", async () => {
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit({ ...validForm, first_name: "  " });
    expect(ok).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(c.fieldErrors.value.last_name).toBeUndefined();
    expect(c.fieldErrors.value.first_name).toBeTruthy();
  });

  it("#281: 名だけ入力で姓空欄は first_name OK / last_name エラーになり API は呼ばれない", async () => {
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit({ ...validForm, last_name: "" });
    expect(ok).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
    expect(c.fieldErrors.value.last_name).toBeTruthy();
    expect(c.fieldErrors.value.first_name).toBeUndefined();
  });

  it("既登録エラー（409 already-registered）で errorCode='already-registered' + email field error", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: {
          json: async () => ({ error: "already-registered" }),
        },
      },
    });
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit(validForm);
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("already-registered");
    expect(c.fieldErrors.value.email).toBeTruthy();
  });

  it("レート制限（429 rate-limited）で retryAfter をセット", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: {
          json: async () => ({ error: "rate-limited", retryAfter: 45 }),
        },
      },
    });
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit(validForm);
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("rate-limited");
    expect(c.retryAfterSec.value).toBe(45);
  });

  it("サーバ側 validation エラー（400）でフィールドエラーが返る", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: {
          json: async () => ({
            error: "validation-error",
            fieldErrors: [{ field: "email", message: "サーバ側エラー" }],
          }),
        },
      },
    });
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit(validForm);
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("validation");
    expect(c.fieldErrors.value.email).toBe("サーバ側エラー");
  });

  it("メール送信失敗（502 mail-send-failed）で errorCode='mail-send-failed'", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: "Edge Function returned a non-2xx status code",
        context: {
          json: async () => ({ error: "mail-send-failed" }),
        },
      },
    });
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit(validForm);
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("mail-send-failed");
  });

  it("ネットワーク失敗（fetch error）で errorCode='network'", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "failed to fetch", context: undefined },
    });
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    const ok = await c.submit(validForm);
    expect(ok).toBe(false);
    expect(c.errorCode.value).toBe("network");
  });

  it("reset() で state クリア", async () => {
    invokeMock.mockResolvedValue({
      data: { ok: true, expiresAt: "2026-05-11T11:00:00.000Z" },
      error: null,
    });
    const { useRequestSignupCode } = await import("./useRequestSignupCode");
    const c = useRequestSignupCode();
    await c.submit(validForm);
    c.reset();
    expect(c.status.value).toBe("idle");
    expect(c.errorCode.value).toBeNull();
    expect(c.expiresAt.value).toBeNull();
  });
});
