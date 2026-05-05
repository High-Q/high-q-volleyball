import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";

const approveMutationMock = vi.fn();
const refreshPendingCountMock = vi.fn().mockResolvedValue(undefined);
const toastMock = vi.fn();

vi.mock("../api/approveMutation", () => ({
  approveIdentityDocument: (...args: unknown[]) => approveMutationMock(...args),
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
const ADMIN_ID = "admin-1" as MemberId;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.resetAllMocks();
});

describe("useIdentityDocumentApprove — open/cancel", () => {
  it("初期状態は isOpen=false / isApproving=false / approveError=null", async () => {
    const { useIdentityDocumentApprove } = await import(
      "./useIdentityDocumentApprove"
    );
    let captured!: ReturnType<typeof useIdentityDocumentApprove>;
    const Harness = defineComponent({
      setup() {
        captured = useIdentityDocumentApprove(DOC_ID, ADMIN_ID);
        return () => h("div");
      },
    });
    mount(Harness);
    expect(captured.isOpen.value).toBe(false);
    expect(captured.isApproving.value).toBe(false);
    expect(captured.approveError.value).toBeNull();
  });

  it("open() で isOpen=true、approveError がクリアされる", async () => {
    const { useIdentityDocumentApprove } = await import(
      "./useIdentityDocumentApprove"
    );
    let captured!: ReturnType<typeof useIdentityDocumentApprove>;
    const Harness = defineComponent({
      setup() {
        captured = useIdentityDocumentApprove(DOC_ID, ADMIN_ID);
        return () => h("div");
      },
    });
    mount(Harness);
    captured.approveError.value = {
      code: "DB_FAILED",
      message: "old",
    };
    captured.open();
    expect(captured.isOpen.value).toBe(true);
    expect(captured.approveError.value).toBeNull();
  });

  it("cancel() で isOpen=false", async () => {
    const { useIdentityDocumentApprove } = await import(
      "./useIdentityDocumentApprove"
    );
    let captured!: ReturnType<typeof useIdentityDocumentApprove>;
    const Harness = defineComponent({
      setup() {
        captured = useIdentityDocumentApprove(DOC_ID, ADMIN_ID);
        return () => h("div");
      },
    });
    mount(Harness);
    captured.open();
    captured.cancel();
    expect(captured.isOpen.value).toBe(false);
  });
});

describe("useIdentityDocumentApprove — confirm()", () => {
  it("成功時: Dialog を閉じる + pendingCount.refresh + Toast + onSuccess 呼び出し", async () => {
    approveMutationMock.mockResolvedValue({ ok: true, value: undefined });
    const { useIdentityDocumentApprove } = await import(
      "./useIdentityDocumentApprove"
    );
    let captured!: ReturnType<typeof useIdentityDocumentApprove>;
    const Harness = defineComponent({
      setup() {
        captured = useIdentityDocumentApprove(DOC_ID, ADMIN_ID);
        return () => h("div");
      },
    });
    mount(Harness);
    captured.open();

    const onSuccess = vi.fn();
    await captured.confirm(onSuccess);
    await flushPromises();

    expect(approveMutationMock).toHaveBeenCalledWith(DOC_ID, ADMIN_ID);
    expect(captured.isOpen.value).toBe(false);
    expect(refreshPendingCountMock).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith({ title: "承認しました" });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("失敗 (DB_FAILED) 時: approveError を保持、Dialog は開いたまま、onSuccess は呼ばれない", async () => {
    approveMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "DB_FAILED", message: "x" },
    });
    const { useIdentityDocumentApprove } = await import(
      "./useIdentityDocumentApprove"
    );
    let captured!: ReturnType<typeof useIdentityDocumentApprove>;
    const Harness = defineComponent({
      setup() {
        captured = useIdentityDocumentApprove(DOC_ID, ADMIN_ID);
        return () => h("div");
      },
    });
    mount(Harness);
    captured.open();

    const onSuccess = vi.fn();
    await captured.confirm(onSuccess);
    await flushPromises();

    expect(captured.approveError.value?.code).toBe("DB_FAILED");
    expect(captured.isOpen.value).toBe(true);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(refreshPendingCountMock).not.toHaveBeenCalled();
  });

  it("失敗 (ALREADY_REVIEWED) 時: approveError に ALREADY_REVIEWED が入る", async () => {
    approveMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "ALREADY_REVIEWED", message: "x" },
    });
    const { useIdentityDocumentApprove } = await import(
      "./useIdentityDocumentApprove"
    );
    let captured!: ReturnType<typeof useIdentityDocumentApprove>;
    const Harness = defineComponent({
      setup() {
        captured = useIdentityDocumentApprove(DOC_ID, ADMIN_ID);
        return () => h("div");
      },
    });
    mount(Harness);
    captured.open();
    await captured.confirm();
    await flushPromises();
    expect(captured.approveError.value?.code).toBe("ALREADY_REVIEWED");
  });

  it("isApproving は confirm 中 true、終了後 false", async () => {
    let resolveFn!: (v: unknown) => void;
    approveMutationMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        }),
    );
    const { useIdentityDocumentApprove } = await import(
      "./useIdentityDocumentApprove"
    );
    let captured!: ReturnType<typeof useIdentityDocumentApprove>;
    const Harness = defineComponent({
      setup() {
        captured = useIdentityDocumentApprove(DOC_ID, ADMIN_ID);
        return () => h("div");
      },
    });
    mount(Harness);

    const promise = captured.confirm();
    expect(captured.isApproving.value).toBe(true);
    resolveFn({ ok: true, value: undefined });
    await promise;
    await flushPromises();
    expect(captured.isApproving.value).toBe(false);
  });
});

describe("useIdentityDocumentApprove — error message mapping", () => {
  it("getApproveErrorMessage は code に対応する日本語メッセージを返す", async () => {
    const { getApproveErrorMessage } = await import(
      "./useIdentityDocumentApprove"
    );
    expect(
      getApproveErrorMessage({ code: "DB_FAILED", message: "x" }),
    ).toContain("承認に失敗");
    expect(
      getApproveErrorMessage({ code: "ALREADY_REVIEWED", message: "x" }),
    ).toContain("他の管理者");
    expect(
      getApproveErrorMessage({ code: "NETWORK_ERROR", message: "x" }),
    ).toContain("通信に失敗");
  });
});
