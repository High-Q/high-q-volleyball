import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  document.body.innerHTML = "";
});

async function renderDialog(props: { disabled?: boolean } = {}) {
  const Component = (await import("./IdentityDocumentRejectDialog.vue"))
    .default;
  const wrapper = mount(Component, {
    props: {
      documentId: DOC_ID,
      adminMemberId: ADMIN_ID,
      memberId: MEM_ID,
      memberName: "田中",
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

describe("IdentityDocumentRejectDialog — editing フェーズ", () => {
  it("初期状態では Dialog が閉じている", async () => {
    await renderDialog();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("trigger 押下で Dialog が開き、理由テキストエリアと文字数カウンターが表示される", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.querySelector("textarea")).not.toBeNull();
    expect(document.body.textContent).toContain("0 / 500");
  });

  it("理由が空のとき「差し戻す」ボタンが disabled", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const submitBtn = findButtonByText("差し戻す");
    expect(submitBtn?.disabled).toBe(true);
  });

  it("理由が 501 文字のとき disabled + 赤色文字数カウンター", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "あ".repeat(501);
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    expect(document.body.textContent).toContain("501 / 500");
    expect(document.body.textContent).toContain("500 文字以内で入力");
    const submitBtn = findButtonByText("差し戻す");
    expect(submitBtn?.disabled).toBe(true);
  });

  it("理由が 1〜500 文字のとき「差し戻す」が活性化", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "画像不鮮明";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    const submitBtn = findButtonByText("差し戻す");
    expect(submitBtn?.disabled).toBe(false);
  });

  it("disabled prop で trigger ボタンが disabled (二重承認防御)", async () => {
    const wrapper = await renderDialog({ disabled: true });
    const triggerBtn = wrapper.find("button");
    expect(triggerBtn.attributes("disabled")).toBeDefined();
    expect(triggerBtn.attributes("aria-disabled")).toBe("true");
  });
});

describe("IdentityDocumentRejectDialog — submit 成功 (success フェーズ)", () => {
  beforeEach(() => {
    rejectMutationMock.mockResolvedValue({
      ok: true,
      value: {
        memberEmail: "tanaka@example.com",
        memberName: "田中",
        cancelledCount: 2,
      },
    });
  });

  it("成功で success フェーズに遷移、mailto: リンクが描画される", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "画像不鮮明";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    findButtonByText("差し戻す")?.click();
    await flushPromises();

    expect(document.body.textContent).toContain("差し戻しが完了しました");
    expect(document.body.textContent).toContain("予約 2 件もキャンセル");
    const mailtoLink = document.querySelector(
      'a[href^="mailto:"]',
    ) as HTMLAnchorElement;
    expect(mailtoLink).not.toBeNull();
    expect(mailtoLink.href).toContain("mailto:tanaka@example.com");
    expect(mailtoLink.href).toContain(encodeURIComponent("画像不鮮明"));
    expect(mailtoLink.href).toContain(
      encodeURIComponent("予約 2 件をキャンセル"),
    );
  });

  it("「閉じる」ボタンで rejected が emit + Toast 表示", async () => {
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "x";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    findButtonByText("差し戻す")?.click();
    await flushPromises();
    findButtonByText("閉じる")?.click();
    await flushPromises();

    expect(wrapper.emitted("rejected")).toHaveLength(1);
    expect(toastMock).toHaveBeenCalled();
  });
});

describe("IdentityDocumentRejectDialog — submit 失敗", () => {
  it("DB_FAILED でエラー inline 表示 + editing フェーズのまま (rejected emit なし)", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "DB_FAILED", message: "x" },
    });
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "x";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    findButtonByText("差し戻す")?.click();
    await flushPromises();

    const alerts = Array.from(document.querySelectorAll('[role="alert"]'));
    const errorAlert = alerts.find((a) =>
      a.textContent?.includes("差し戻しに失敗"),
    );
    expect(errorAlert).toBeDefined();
    expect(wrapper.emitted("rejected")).toBeUndefined();
  });

  it("CANCEL_FAILED_AFTER_REJECT で手動復旧誘導文言表示", async () => {
    rejectMutationMock.mockResolvedValue({
      ok: false,
      error: { code: "CANCEL_FAILED_AFTER_REJECT", message: "x" },
    });
    const wrapper = await renderDialog();
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const textarea = document.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "x";
    textarea.dispatchEvent(new Event("input"));
    await flushPromises();
    findButtonByText("差し戻す")?.click();
    await flushPromises();

    expect(document.body.textContent).toContain("Supabase Dashboard");
  });
});
