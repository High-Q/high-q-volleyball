import { mount, flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
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
  approveMutationMock.mockResolvedValue({ ok: true, value: undefined });
});

afterEach(() => {
  document.body.innerHTML = "";
});

async function renderDialog(props: { disabled?: boolean } = {}) {
  const Component = (await import("./IdentityDocumentApproveDialog.vue"))
    .default;
  const wrapper = mount(Component, {
    props: {
      documentId: DOC_ID,
      adminMemberId: ADMIN_ID,
      memberName: "田中太郎",
      documentTypeLabel: "運転免許証",
      ...props,
    },
    attachTo: document.body,
  });
  return wrapper;
}

describe("IdentityDocumentApproveDialog", () => {
  it("初期状態は AlertDialog が閉じている (role='alertdialog' なし)", async () => {
    await renderDialog();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("trigger ボタンを押すと AlertDialog が開く", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("この書類を承認しますか?");
    expect(document.body.textContent).toContain("田中太郎");
    expect(document.body.textContent).toContain("運転免許証");
  });

  it("disabled=true で trigger ボタンが disabled (aria-disabled=true) になる", async () => {
    const wrapper = await renderDialog({ disabled: true });
    const triggerBtn = wrapper.find("button");
    expect(triggerBtn.attributes("disabled")).toBeDefined();
    expect(triggerBtn.attributes("aria-disabled")).toBe("true");
  });

  it("承認成功で approved イベントが emit される", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    // dialog 内の「承認する」ボタン押下
    const allButtons = Array.from(document.querySelectorAll("button"));
    const confirmBtn = allButtons.find(
      (b) => b.textContent?.trim() === "承認する",
    );
    expect(confirmBtn).toBeDefined();
    confirmBtn?.click();
    await flushPromises();
    expect(wrapper.emitted("approved")).toHaveLength(1);
    expect(toastMock).toHaveBeenCalledWith({ title: "承認しました" });
    expect(refreshPendingCountMock).toHaveBeenCalled();
  });

  it("二重承認防止: ALREADY_REVIEWED エラーで inline error 表示 + approved emit なし", async () => {
    approveMutationMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "ALREADY_REVIEWED", message: "x" },
    });
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const allButtons = Array.from(document.querySelectorAll("button"));
    const confirmBtn = allButtons.find(
      (b) => b.textContent?.trim() === "承認する",
    );
    confirmBtn?.click();
    await flushPromises();
    const alert = document.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("他の管理者");
    expect(wrapper.emitted("approved")).toBeUndefined();
  });
});
