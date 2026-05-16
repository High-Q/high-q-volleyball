import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
const signOutMock = vi.fn();
const memberRef = { value: { id: "test-member-id" } as { id: string } | null };

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
    auth: {
      signOut: () => signOutMock(),
    },
  }),
}));

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({ member: memberRef }),
}));

vi.mock("@/shared/lib/externalLinks", () => ({
  LP_TOP_URL: "https://lp.example.com",
}));

// window.location.href の書き換えを捕捉
const locationHrefSetter = vi.fn();
Object.defineProperty(window, "location", {
  configurable: true,
  value: {
    get href() {
      return "";
    },
    set href(v: string) {
      locationHrefSetter(v);
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  memberRef.value = { id: "test-member-id" };
  signOutMock.mockResolvedValue(undefined);
});

describe("useAccountDeletion — open/cancel/consent", () => {
  it("初期状態は閉じていて consent=false / canConfirm=false", async () => {
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    expect(d.isOpen.value).toBe(false);
    expect(d.consent.value).toBe(false);
    expect(d.canConfirm.value).toBe(false);
  });

  it("open() で開き、エラーと consent を初期化", async () => {
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    d.deletionError.value = "INTERNAL";
    d.consent.value = true;
    d.open();
    expect(d.isOpen.value).toBe(true);
    expect(d.deletionError.value).toBeNull();
    expect(d.consent.value).toBe(false);
  });

  it("consent ON で canConfirm=true、OFF で false", async () => {
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    d.consent.value = true;
    expect(d.canConfirm.value).toBe(true);
    d.consent.value = false;
    expect(d.canConfirm.value).toBe(false);
  });

  it("cancel() で閉じる、Function は呼ばれない", async () => {
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    d.open();
    d.cancel();
    expect(d.isOpen.value).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe("useAccountDeletion — confirm 成功", () => {
  it("consent ON + confirm で Function 呼び出し → signOut → LP リダイレクト", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    d.open();
    d.consent.value = true;

    await d.confirm();

    expect(invokeMock).toHaveBeenCalledWith("withdraw-member", {
      body: { target_member_id: "test-member-id" },
    });
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(locationHrefSetter).toHaveBeenCalledWith(
      "https://lp.example.com/?withdrawn=1",
    );
  });

  it("consent OFF だと confirm を呼んでも Function は呼ばれない", async () => {
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    d.open();
    d.consent.value = false;

    await d.confirm();

    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe("useAccountDeletion — confirm 失敗経路", () => {
  it("member が null なら FORBIDDEN", async () => {
    memberRef.value = null;
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    d.open();
    d.consent.value = true;

    await d.confirm();

    expect(d.deletionError.value).toBe("FORBIDDEN");
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("403 → FORBIDDEN にマッピング、セッション維持", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { context: { status: 403 } },
    });
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    d.open();
    d.consent.value = true;

    await d.confirm();

    expect(d.deletionError.value).toBe("FORBIDDEN");
    expect(d.isOpen.value).toBe(true);
    expect(signOutMock).not.toHaveBeenCalled();
    expect(locationHrefSetter).not.toHaveBeenCalled();
  });

  it("500 → INTERNAL にマッピング", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { context: { status: 500 } },
    });
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    d.open();
    d.consent.value = true;

    await d.confirm();

    expect(d.deletionError.value).toBe("INTERNAL");
  });

  it("network error → NETWORK_ERROR", async () => {
    invokeMock.mockRejectedValue(new Error("boom"));
    const { useAccountDeletion } = await import("./useAccountDeletion");
    const d = useAccountDeletion();
    d.open();
    d.consent.value = true;

    await d.confirm();

    expect(d.deletionError.value).toBe("NETWORK_ERROR");
    expect(d.isDeleting.value).toBe(false);
  });
});

describe("getDeletionErrorMessage", () => {
  it("既知 code を日本語メッセージに変換", async () => {
    const { getDeletionErrorMessage } = await import("./useAccountDeletion");
    expect(getDeletionErrorMessage("NETWORK_ERROR")).toContain("通信");
    expect(getDeletionErrorMessage("FORBIDDEN")).toContain("権限");
    expect(getDeletionErrorMessage("INTERNAL")).toContain("時間");
    expect(getDeletionErrorMessage("AUTH_DELETE_FAILED")).toContain("ログアウト");
  });
});
