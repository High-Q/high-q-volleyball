import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";

const rejectMutationMock = vi.fn();
const refreshPendingCountMock = vi.fn().mockResolvedValue(undefined);
const toastMock = vi.fn();

vi.mock("../api/rejectMutation", () => ({
  rejectIdentityDocument: (...args: unknown[]) => rejectMutationMock(...args),
}));

vi.mock("@/features/identity-document-pending-badge", () => ({
  usePendingCount: () => ({
    count: { value: 0 },
    loading: { value: false },
    error: { value: null },
    refresh: refreshPendingCountMock,
  }),
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const DOC_ID = "doc-1" as IdentityDocumentId;
const MEM_ID = "mem-1" as MemberId;
const ADMIN_ID = "admin-1" as MemberId;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

async function setup() {
  const { useIdentityDocumentReject } = await import(
    "./useIdentityDocumentReject"
  );
  let captured!: ReturnType<typeof useIdentityDocumentReject>;
  const Harness = defineComponent({
    setup() {
      captured = useIdentityDocumentReject(DOC_ID, ADMIN_ID, MEM_ID);
      return () => h("div");
    },
  });
  mount(Harness);
  return captured;
}

describe("useIdentityDocumentReject — 初期状態 + open/cancel", () => {
  it("初期: isOpen=false / phase=editing / reason='' / rejectError=null / reviewSuccess=null", async () => {
    const c = await setup();
    expect(c.isOpen.value).toBe(false);
    expect(c.phase.value).toBe("editing");
    expect(c.reason.value).toBe("");
    expect(c.rejectError.value).toBeNull();
    expect(c.reviewSuccess.value).toBeNull();
  });

  it("open() で isOpen=true、state がリセットされる", async () => {
    const c = await setup();
    c.reason.value = "old";
    c.rejectError.value = { code: "DB_FAILED", message: "x" };
    c.open();
    expect(c.isOpen.value).toBe(true);
    expect(c.reason.value).toBe("");
    expect(c.rejectError.value).toBeNull();
  });

  it("cancel() で isOpen=false + state リセット", async () => {
    const c = await setup();
    c.open();
    c.reason.value = "x";
    c.cancel();
    expect(c.isOpen.value).toBe(false);
    expect(c.reason.value).toBe("");
  });
});

describe("useIdentityDocumentReject — バリデーション", () => {
  it("reason が空のとき isReasonInvalid=true / canSubmit=false", async () => {
    const c = await setup();
    expect(c.isReasonInvalid.value).toBe(true);
    expect(c.canSubmit.value).toBe(false);
  });

  it("reason が空白のみのとき isReasonInvalid=true", async () => {
    const c = await setup();
    c.reason.value = "    ";
    expect(c.isReasonInvalid.value).toBe(true);
  });

  it("reason が 501 文字のとき isReasonInvalid=true / canSubmit=false", async () => {
    const c = await setup();
    c.reason.value = "あ".repeat(501);
    expect(c.reasonLength.value).toBe(501);
    expect(c.isReasonInvalid.value).toBe(true);
  });

  it("reason が 1〜500 文字のとき canSubmit=true", async () => {
    const c = await setup();
    c.reason.value = "理由 X";
    expect(c.canSubmit.value).toBe(true);
  });
});

describe("useIdentityDocumentReject — submit() 正常系", () => {
  it("成功時: phase=success / reviewSuccess に値 / pendingCount.refresh", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: true,
      value: {
        memberEmail: "tanaka@example.com",
        memberName: "田中",
        cancelledCount: 2,
      },
    });
    const c = await setup();
    c.open();
    c.reason.value = "画像不鮮明";
    await c.submit();
    await flushPromises();
    expect(c.phase.value).toBe("success");
    expect(c.reviewSuccess.value?.cancelledCount).toBe(2);
    expect(c.reviewSuccess.value?.memberEmail).toBe("tanaka@example.com");
    expect(refreshPendingCountMock).toHaveBeenCalled();
  });

  it("成功時 mailtoHref が cancelledCount を反映", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: true,
      value: {
        memberEmail: "tanaka@example.com",
        memberName: "田中",
        cancelledCount: 3,
      },
    });
    const c = await setup();
    c.open();
    c.reason.value = "x";
    await c.submit();
    await flushPromises();
    expect(c.mailtoHref.value).toContain("mailto:tanaka@example.com");
    expect(c.mailtoHref.value).toContain(
      encodeURIComponent("予約 3 件をキャンセル"),
    );
  });

  it("rejectMutation の input に documentId / adminMemberId / memberId / reason が渡される", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: true,
      value: {
        memberEmail: "x@x",
        memberName: "n",
        cancelledCount: 0,
      },
    });
    const c = await setup();
    c.open();
    c.reason.value = "理由";
    await c.submit();
    await flushPromises();
    expect(rejectMutationMock).toHaveBeenCalledWith({
      documentId: DOC_ID,
      adminMemberId: ADMIN_ID,
      memberId: MEM_ID,
      reason: "理由",
    });
  });
});

describe("useIdentityDocumentReject — submit() 失敗系", () => {
  it("DB_FAILED で phase='editing' に戻り rejectError 保持", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "DB_FAILED", message: "x" },
    });
    const c = await setup();
    c.open();
    c.reason.value = "x";
    await c.submit();
    await flushPromises();
    expect(c.phase.value).toBe("editing");
    expect(c.rejectError.value?.code).toBe("DB_FAILED");
  });

  it("ALREADY_REVIEWED で rejectError 保持 + pendingCount.refresh は呼ばれない", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "ALREADY_REVIEWED", message: "x" },
    });
    const c = await setup();
    c.open();
    c.reason.value = "x";
    await c.submit();
    await flushPromises();
    expect(c.rejectError.value?.code).toBe("ALREADY_REVIEWED");
    expect(refreshPendingCountMock).not.toHaveBeenCalled();
  });

  it("CANCEL_FAILED_AFTER_REJECT で rejectError 保持", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "CANCEL_FAILED_AFTER_REJECT", message: "x" },
    });
    const c = await setup();
    c.open();
    c.reason.value = "x";
    await c.submit();
    await flushPromises();
    expect(c.rejectError.value?.code).toBe("CANCEL_FAILED_AFTER_REJECT");
  });

  it("canSubmit=false のとき submit() は no-op", async () => {
    const c = await setup();
    c.open();
    c.reason.value = "";
    await c.submit();
    expect(rejectMutationMock).not.toHaveBeenCalled();
    expect(c.phase.value).toBe("editing");
  });
});

describe("useIdentityDocumentReject — closeAfterMail()", () => {
  it("closeAfterMail() で isOpen=false / state リセット / Toast / onSuccess", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: true,
      value: { memberEmail: "x@x", memberName: "n", cancelledCount: 1 },
    });
    const c = await setup();
    c.open();
    c.reason.value = "x";
    await c.submit();
    await flushPromises();

    const onSuccess = vi.fn();
    c.closeAfterMail(onSuccess);
    expect(c.isOpen.value).toBe(false);
    expect(c.reviewSuccess.value).toBeNull();
    expect(toastMock).toHaveBeenCalled();
    expect(toastMock.mock.calls[0]?.[0]?.title).toContain(
      "差し戻しました (予約 1 件もキャンセル)",
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("cancelledCount=0 のとき Toast 文言に件数言及なし", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: true,
      value: { memberEmail: "x@x", memberName: "n", cancelledCount: 0 },
    });
    const c = await setup();
    c.open();
    c.reason.value = "x";
    await c.submit();
    await flushPromises();
    c.closeAfterMail();
    expect(toastMock.mock.calls[0]?.[0]?.title).toBe("差し戻しました");
  });
});

describe("useIdentityDocumentReject — エラーメッセージマッピング", () => {
  it("getRejectErrorMessage は CANCEL_FAILED_AFTER_REJECT を手動復旧誘導文言にマップ", async () => {
    const { getRejectErrorMessage } = await import(
      "./useIdentityDocumentReject"
    );
    const msg = getRejectErrorMessage({
      code: "CANCEL_FAILED_AFTER_REJECT",
      message: "x",
    });
    expect(msg).toContain("Supabase Dashboard");
  });

  it("getRejectErrorMessage は INVALID_REASON / DB_FAILED / ALREADY_REVIEWED / NETWORK_ERROR を全カバー", async () => {
    const { getRejectErrorMessage } = await import(
      "./useIdentityDocumentReject"
    );
    expect(
      getRejectErrorMessage({ code: "INVALID_REASON", message: "x" }),
    ).toContain("500");
    expect(
      getRejectErrorMessage({ code: "DB_FAILED", message: "x" }),
    ).toContain("差し戻しに失敗");
    expect(
      getRejectErrorMessage({ code: "ALREADY_REVIEWED", message: "x" }),
    ).toContain("他の管理者");
    expect(
      getRejectErrorMessage({ code: "NETWORK_ERROR", message: "x" }),
    ).toContain("通信");
  });
});
