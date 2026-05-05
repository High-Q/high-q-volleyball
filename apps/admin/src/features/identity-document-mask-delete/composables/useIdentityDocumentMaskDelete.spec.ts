import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";

const maskDeleteMutationMock = vi.fn();
const refreshPendingCountMock = vi.fn().mockResolvedValue(undefined);
const toastMock = vi.fn();

vi.mock("../api/maskDeleteMutation", () => ({
  maskDeleteIdentityDocument: (...args: unknown[]) =>
    maskDeleteMutationMock(...args),
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
const PATHS = {
  front: "mem-1/doc-1-front.jpg",
  back: "mem-1/doc-1-back.jpg",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

async function setup() {
  const { useIdentityDocumentMaskDelete } = await import(
    "./useIdentityDocumentMaskDelete"
  );
  let captured!: ReturnType<typeof useIdentityDocumentMaskDelete>;
  const Harness = defineComponent({
    setup() {
      captured = useIdentityDocumentMaskDelete(DOC_ID, ADMIN_ID, MEM_ID, PATHS);
      return () => h("div");
    },
  });
  mount(Harness);
  return captured;
}

describe("useIdentityDocumentMaskDelete — open/cancel", () => {
  it("初期: isOpen=false / phase=editing", async () => {
    const c = await setup();
    expect(c.isOpen.value).toBe(false);
    expect(c.phase.value).toBe("editing");
    expect(c.maskDeleteError.value).toBeNull();
    expect(c.reviewSuccess.value).toBeNull();
  });

  it("open() で isOpen=true、state リセット", async () => {
    const c = await setup();
    c.maskDeleteError.value = {
      code: "STORAGE_FAILED",
      message: "old",
    };
    c.open();
    expect(c.isOpen.value).toBe(true);
    expect(c.maskDeleteError.value).toBeNull();
  });

  it("cancel() で isOpen=false + state リセット", async () => {
    const c = await setup();
    c.open();
    c.cancel();
    expect(c.isOpen.value).toBe(false);
  });
});

describe("useIdentityDocumentMaskDelete — submit() 正常系", () => {
  it("成功で phase='success' + reviewSuccess 値 + pendingCount.refresh", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: true,
      value: {
        memberEmail: "tanaka@example.com",
        memberName: "田中",
        cancelledCount: 1,
      },
    });
    const c = await setup();
    c.open();
    await c.submit();
    await flushPromises();
    expect(c.phase.value).toBe("success");
    expect(c.reviewSuccess.value?.cancelledCount).toBe(1);
    expect(refreshPendingCountMock).toHaveBeenCalled();
  });

  it("mutation の input に documentId / adminMemberId / memberId / storagePaths が渡る", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: true,
      value: { memberEmail: "x@x", memberName: "n", cancelledCount: 0 },
    });
    const c = await setup();
    c.open();
    await c.submit();
    await flushPromises();
    expect(maskDeleteMutationMock).toHaveBeenCalledWith({
      documentId: DOC_ID,
      adminMemberId: ADMIN_ID,
      memberId: MEM_ID,
      storagePaths: PATHS,
    });
  });

  it("mailtoHref が cancelledCount を反映", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: true,
      value: { memberEmail: "u@x", memberName: "n", cancelledCount: 2 },
    });
    const c = await setup();
    c.open();
    await c.submit();
    await flushPromises();
    expect(c.mailtoHref.value).toContain("mailto:u@x");
    expect(c.mailtoHref.value).toContain(
      encodeURIComponent("予約 2 件をキャンセル"),
    );
  });
});

describe("useIdentityDocumentMaskDelete — submit() 失敗系", () => {
  it("STORAGE_FAILED で phase='editing' に戻り maskDeleteError 保持", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "STORAGE_FAILED", message: "x" },
    });
    const c = await setup();
    c.open();
    await c.submit();
    await flushPromises();
    expect(c.phase.value).toBe("editing");
    expect(c.maskDeleteError.value?.code).toBe("STORAGE_FAILED");
  });

  it("DB_FAILED_AFTER_STORAGE_DELETE で エラーコード保持", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "DB_FAILED_AFTER_STORAGE_DELETE", message: "x" },
    });
    const c = await setup();
    c.open();
    await c.submit();
    await flushPromises();
    expect(c.maskDeleteError.value?.code).toBe(
      "DB_FAILED_AFTER_STORAGE_DELETE",
    );
  });

  it("CANCEL_FAILED_AFTER_MASK_DELETE で エラーコード保持", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "CANCEL_FAILED_AFTER_MASK_DELETE", message: "x" },
    });
    const c = await setup();
    c.open();
    await c.submit();
    await flushPromises();
    expect(c.maskDeleteError.value?.code).toBe(
      "CANCEL_FAILED_AFTER_MASK_DELETE",
    );
  });

  it("ALREADY_REVIEWED で エラーコード保持 + pendingCount.refresh は呼ばれない", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "ALREADY_REVIEWED", message: "x" },
    });
    const c = await setup();
    c.open();
    await c.submit();
    await flushPromises();
    expect(c.maskDeleteError.value?.code).toBe("ALREADY_REVIEWED");
    expect(refreshPendingCountMock).not.toHaveBeenCalled();
  });
});

describe("useIdentityDocumentMaskDelete — closeAfterMail()", () => {
  it("Toast + onSuccess + isOpen=false + state リセット", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: true,
      value: { memberEmail: "x@x", memberName: "n", cancelledCount: 3 },
    });
    const c = await setup();
    c.open();
    await c.submit();
    await flushPromises();

    const onSuccess = vi.fn();
    c.closeAfterMail(onSuccess);
    expect(c.isOpen.value).toBe(false);
    expect(c.reviewSuccess.value).toBeNull();
    expect(toastMock.mock.calls[0]?.[0]?.title).toContain(
      "削除しました (予約 3 件もキャンセル)",
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});

describe("useIdentityDocumentMaskDelete — getMaskDeleteErrorMessage", () => {
  it("各 ErrorCode が日本語メッセージにマップされる", async () => {
    const { getMaskDeleteErrorMessage } = await import(
      "./useIdentityDocumentMaskDelete"
    );
    expect(
      getMaskDeleteErrorMessage({ code: "STORAGE_FAILED", message: "x" }),
    ).toContain("Storage 削除に失敗");
    expect(
      getMaskDeleteErrorMessage({
        code: "DB_FAILED_AFTER_STORAGE_DELETE",
        message: "x",
      }),
    ).toContain("Supabase Dashboard");
    expect(
      getMaskDeleteErrorMessage({
        code: "CANCEL_FAILED_AFTER_MASK_DELETE",
        message: "x",
      }),
    ).toContain("予約のキャンセルに失敗");
    expect(
      getMaskDeleteErrorMessage({ code: "ALREADY_REVIEWED", message: "x" }),
    ).toContain("他の管理者");
  });
});
