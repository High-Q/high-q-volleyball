import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
const PATHS = { front: "mem-1/f.jpg", back: "mem-1/b.jpg" };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.innerHTML = "";
});

async function renderDialog(props: { disabled?: boolean } = {}) {
  const Component = (await import("./IdentityDocumentMaskDeleteDialog.vue"))
    .default;
  const wrapper = mount(Component, {
    props: {
      documentId: DOC_ID,
      adminMemberId: ADMIN_ID,
      memberId: MEM_ID,
      memberName: "田中",
      storagePaths: PATHS,
      ...props,
    },
    attachTo: document.body,
  });
  return wrapper;
}

function findButtonByText(text: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  ) as HTMLButtonElement | undefined;
}

describe("IdentityDocumentMaskDeleteDialog — editing", () => {
  it("初期状態で Dialog が閉じている", async () => {
    await renderDialog();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("trigger 押下で Dialog が開き確認文言が表示", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    expect(document.body.textContent).toContain(
      "Storage から完全削除しますか?",
    );
    expect(document.body.textContent).toContain("元に戻せません");
  });

  it("disabled prop で trigger 自体が disabled", async () => {
    const wrapper = await renderDialog({ disabled: true });
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
    expect(wrapper.find("button").attributes("aria-disabled")).toBe("true");
  });
});

describe("IdentityDocumentMaskDeleteDialog — 成功 (success フェーズ)", () => {
  beforeEach(() => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: true,
      value: {
        memberEmail: "tanaka@example.com",
        memberName: "田中",
        cancelledCount: 1,
      },
    });
  });

  it("「削除する」確定で success フェーズに遷移、mailto: リンクが描画される", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    findButtonByText("削除する")?.click();
    await flushPromises();
    expect(document.body.textContent).toContain("削除が完了しました");
    expect(document.body.textContent).toContain("予約 1 件もキャンセル");
    const mailtoLink = document.querySelector(
      'a[href^="mailto:"]',
    ) as HTMLAnchorElement;
    expect(mailtoLink).not.toBeNull();
    expect(mailtoLink.href).toContain("mailto:tanaka@example.com");
  });

  it("「閉じる」で maskDeleted emit + Toast", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    findButtonByText("削除する")?.click();
    await flushPromises();
    findButtonByText("閉じる")?.click();
    await flushPromises();
    expect(wrapper.emitted("maskDeleted")).toHaveLength(1);
    expect(toastMock).toHaveBeenCalled();
  });
});

describe("IdentityDocumentMaskDeleteDialog — 失敗", () => {
  it("STORAGE_FAILED で inline error 表示 + maskDeleted emit なし", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "STORAGE_FAILED", message: "x" },
    });
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    findButtonByText("削除する")?.click();
    await flushPromises();
    const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
    const errorAlert = alerts.find((a) =>
      a.textContent?.includes("Storage 削除に失敗"),
    );
    expect(errorAlert).toBeDefined();
    expect(wrapper.emitted("maskDeleted")).toBeUndefined();
  });

  it("DB_FAILED_AFTER_STORAGE_DELETE で手動復旧誘導文言", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "DB_FAILED_AFTER_STORAGE_DELETE", message: "x" },
    });
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    findButtonByText("削除する")?.click();
    await flushPromises();
    expect(document.body.textContent).toContain("Supabase Dashboard");
  });

  it("CANCEL_FAILED_AFTER_MASK_DELETE で予約キャンセル失敗誘導文言", async () => {
    maskDeleteMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "CANCEL_FAILED_AFTER_MASK_DELETE", message: "x" },
    });
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    findButtonByText("削除する")?.click();
    await flushPromises();
    expect(document.body.textContent).toContain("予約のキャンセルに失敗");
  });
});
