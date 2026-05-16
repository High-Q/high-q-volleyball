import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MemberId } from "@high-q/shared";

const invokeMock = vi.fn();
const toastMock = vi.fn();

vi.mock("@/shared/api/supabase", () => ({
  getSupabase: () => ({
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  }),
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const MID = "11111111-2222-3333-4444-555555555555" as unknown as MemberId;
const TARGET_EMAIL = "rem@example.com";

function makeOptions(onSuccess?: () => void) {
  return { memberId: MID, targetEmail: TARGET_EMAIL, onSuccess };
}

describe("useMemberWithdrawal — open/cancel/email match", () => {
  it("初期状態は閉じていてエラーなし、メール未入力", async () => {
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    expect(w.isOpen.value).toBe(false);
    expect(w.withdrawError.value).toBeNull();
    expect(w.emailInput.value).toBe("");
    expect(w.isEmailMatched.value).toBe(false);
  });

  it("open() で開き、過去のエラーとメール入力をクリア", async () => {
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.withdrawError.value = "INTERNAL";
    w.emailInput.value = "old";
    w.open();
    expect(w.isOpen.value).toBe(true);
    expect(w.withdrawError.value).toBeNull();
    expect(w.emailInput.value).toBe("");
  });

  it("メール完全一致で isEmailMatched=true、不一致は false", async () => {
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.emailInput.value = "rem@example.com";
    expect(w.isEmailMatched.value).toBe(true);
    w.emailInput.value = "rem@example.co";
    expect(w.isEmailMatched.value).toBe(false);
  });

  it("メール前後空白は trim される", async () => {
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.emailInput.value = "  rem@example.com  ";
    expect(w.isEmailMatched.value).toBe(true);
  });

  it("cancel() で閉じる", async () => {
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.open();
    w.cancel();
    expect(w.isOpen.value).toBe(false);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});

describe("useMemberWithdrawal — confirm 成功", () => {
  it("メール一致 + confirm で Function 呼び出し、Toast / onSuccess / close", async () => {
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    const onSuccess = vi.fn();
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions(onSuccess));
    w.open();
    w.emailInput.value = TARGET_EMAIL;

    await w.confirm();

    expect(invokeMock).toHaveBeenCalledWith("withdraw-member", {
      body: { target_member_id: MID },
    });
    expect(w.isOpen.value).toBe(false);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "会員を削除しました" }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("メール不一致のときは confirm を呼んでも Function は invoke されない", async () => {
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.open();
    w.emailInput.value = "wrong@example.com";

    await w.confirm();

    expect(invokeMock).not.toHaveBeenCalled();
    expect(w.isOpen.value).toBe(true);
  });
});

describe("useMemberWithdrawal — confirm 失敗経路", () => {
  it("403 は FORBIDDEN にマッピング", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { context: { status: 403 } },
    });
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.open();
    w.emailInput.value = TARGET_EMAIL;

    await w.confirm();

    expect(w.withdrawError.value).toBe("FORBIDDEN");
    expect(w.isOpen.value).toBe(true);
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("500 は INTERNAL にマッピング", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { context: { status: 500 } },
    });
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.open();
    w.emailInput.value = TARGET_EMAIL;

    await w.confirm();

    expect(w.withdrawError.value).toBe("INTERNAL");
  });

  it("ネットワーク失敗 (status なし) は NETWORK_ERROR", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { context: undefined },
    });
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.open();
    w.emailInput.value = TARGET_EMAIL;

    await w.confirm();

    expect(w.withdrawError.value).toBe("NETWORK_ERROR");
  });

  it("例外 throw は NETWORK_ERROR にフォールバック", async () => {
    invokeMock.mockRejectedValue(new Error("boom"));
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.open();
    w.emailInput.value = TARGET_EMAIL;

    await w.confirm();

    expect(w.withdrawError.value).toBe("NETWORK_ERROR");
    expect(w.isWithdrawing.value).toBe(false);
  });

  it("失敗後に再度 open するとエラーがクリアされる", async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: { context: { status: 500 } },
    });
    const { useMemberWithdrawal } = await import("./useMemberWithdrawal");
    const w = useMemberWithdrawal(makeOptions());
    w.open();
    w.emailInput.value = TARGET_EMAIL;
    await w.confirm();
    expect(w.withdrawError.value).toBe("INTERNAL");
    w.open();
    expect(w.withdrawError.value).toBeNull();
  });
});

describe("getWithdrawErrorMessage", () => {
  it("既知の error code を日本語メッセージに変換", async () => {
    const { getWithdrawErrorMessage } = await import("./useMemberWithdrawal");
    expect(getWithdrawErrorMessage("NETWORK_ERROR")).toContain("通信");
    expect(getWithdrawErrorMessage("FORBIDDEN")).toContain("権限");
    expect(getWithdrawErrorMessage("INTERNAL")).toContain("時間");
    expect(getWithdrawErrorMessage("AUTH_DELETE_FAILED")).toContain("認証");
  });
});
