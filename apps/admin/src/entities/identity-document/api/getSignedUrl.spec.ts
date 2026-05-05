import { beforeEach, describe, expect, it, vi } from "vitest";

const storageBuilderResult = {
  data: null as unknown,
  error: null as unknown,
};

const storageBuilder = {
  createSignedUrl: vi.fn(),
};

const fromMock = vi.fn();

const supabaseClient = {
  storage: {
    from: fromMock,
  },
};

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => supabaseClient,
  _resetSupabaseForTest: () => {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.mockReturnValue(storageBuilder);
  storageBuilderResult.data = null;
  storageBuilderResult.error = null;
  storageBuilder.createSignedUrl = vi
    .fn()
    .mockImplementation(async () => ({ ...storageBuilderResult }));
});

describe("getSignedUrl", () => {
  it("identity-documents バケットに対して createSignedUrl を呼ぶ", async () => {
    storageBuilderResult.data = {
      signedUrl: "https://example.supabase.co/storage/v1/object/sign/...",
    };
    const { getSignedUrl } = await import("./getSignedUrl");
    await getSignedUrl("mem-1/doc-1-front.jpg");
    expect(fromMock).toHaveBeenCalledWith("identity-documents");
    expect(storageBuilder.createSignedUrl).toHaveBeenCalled();
  });

  it("有効期限は 3600 秒 (1 時間) を渡す", async () => {
    storageBuilderResult.data = { signedUrl: "https://example.com/x" };
    const { getSignedUrl } = await import("./getSignedUrl");
    await getSignedUrl("mem-1/doc-1-front.jpg");
    const args = storageBuilder.createSignedUrl.mock.calls[0];
    expect(args?.[1]).toBe(3600);
  });

  it("正常系で signedUrl を Result.ok で返す", async () => {
    storageBuilderResult.data = {
      signedUrl: "https://example.com/sign?token=xxx",
    };
    const { getSignedUrl } = await import("./getSignedUrl");
    const result = await getSignedUrl("mem-1/doc-1-front.jpg");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("https://example.com/sign?token=xxx");
    }
  });

  it("error 発生時は SERVER_ERROR を Result.err で返す", async () => {
    storageBuilderResult.error = { message: "object not found" };
    const { getSignedUrl } = await import("./getSignedUrl");
    const result = await getSignedUrl("mem-1/missing.jpg");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SERVER_ERROR");
      expect(result.error.message).toBe("object not found");
    }
  });

  it("signedUrl が undefined のときも SERVER_ERROR を返す", async () => {
    storageBuilderResult.data = { signedUrl: undefined };
    const { getSignedUrl } = await import("./getSignedUrl");
    const result = await getSignedUrl("mem-1/doc-1-front.jpg");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("SERVER_ERROR");
    }
  });
});
