import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { err, ok, unsafeMemberId } from "@high-q/shared";

/**
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *   「告知テンプレート画面」
 */

const { fetchMock, saveMock, toastMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  saveMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@/entities/announcement-template", async () => {
  const actual = await vi.importActual<typeof import("@/entities/announcement-template")>(
    "@/entities/announcement-template",
  );
  return {
    ...actual,
    fetchAnnouncementTemplate: fetchMock,
    saveAnnouncementTemplate: saveMock,
  };
});

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

import AnnouncementTemplateForm from "./AnnouncementTemplateForm.vue";

const ADMIN = unsafeMemberId("22222222-2222-4222-8222-222222222222");
const TEMPLATE = {
  channel: "line" as const,
  body: "会場: ",
  // 2026-10-29 09:30 JST
  updatedAt: "2026-10-29T00:30:00Z",
  updatedBy: ADMIN,
};

let wrapper: VueWrapper | null = null;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

async function mountForm() {
  wrapper = mount(AnnouncementTemplateForm, {
    props: { adminMemberId: ADMIN },
    attachTo: document.body,
  });
  await flushPromises();
  return wrapper;
}

function body(w: VueWrapper) {
  return w.find('[data-testid="template-body"]');
}

describe("AnnouncementTemplateForm — 4 状態", () => {
  it("Loading: 取得中はスケルトンを表示", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    wrapper = mount(AnnouncementTemplateForm, { props: { adminMemberId: ADMIN } });
    expect(wrapper.find('[aria-label="読み込み中"]').exists()).toBe(true);
  });

  it("Error: 読み込み失敗で再試行を表示し、再試行で再取得する", async () => {
    fetchMock.mockResolvedValueOnce(err({ code: "NETWORK_ERROR", message: "x" }));
    const w = await mountForm();
    const error = w.find('[data-testid="template-load-error"]');
    expect(error.text()).toContain("告知テンプレートを読み込めませんでした");
    fetchMock.mockResolvedValueOnce(ok(TEMPLATE));
    await error.find("button").trigger("click");
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body(w).exists()).toBe(true);
  });

  it("Empty: 未登録なら初期テンプレートと未保存の案内を表示", async () => {
    fetchMock.mockResolvedValue(ok(null));
    const w = await mountForm();
    expect(w.find('[data-testid="template-new-notice"]').exists()).toBe(true);
    expect((body(w).element as HTMLTextAreaElement).value).toContain("{予約リンク}");
    expect(w.find('[data-testid="template-updated-at"]').text()).toBe("未保存");
  });

  it("Success: 登録済み本文・最終更新日時（日本時間）を表示し、初期表示でエラーを出さない", async () => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
    const w = await mountForm();
    expect((body(w).element as HTMLTextAreaElement).value).toBe("会場: ");
    expect(w.find('[data-testid="template-updated-at"]').text()).toBe(
      "最終更新: 2026/10/29 09:30",
    );
    expect(w.find('[role="alert"]').exists()).toBe(false);
    expect(body(w).attributes("aria-invalid")).toBe("false");
  });
});

describe("AnnouncementTemplateForm — 編集", () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(ok(TEMPLATE));
  });

  it("差し込み項目ボタンでカーソル位置に挿入し、プレビューに反映", async () => {
    const w = await mountForm();
    const el = body(w).element as HTMLTextAreaElement;
    el.setSelectionRange(4, 4); // 「会場: 」の末尾
    await w.find('[data-testid="insert-{会場}"]').trigger("click");
    expect(el.value).toBe("会場: {会場}");
    expect(w.find('[data-testid="template-preview"]').text()).toBe("会場: 有明会場");
  });

  it("知らない差し込み項目の注意を表示", async () => {
    const w = await mountForm();
    await body(w).setValue("{集合時刻}");
    expect(w.find('[data-testid="template-unknown-placeholders"]').text()).toContain(
      "{集合時刻} は差し込み項目ではありません",
    );
  });

  it("空の本文は保存できず必須エラーを表示", async () => {
    const w = await mountForm();
    await body(w).setValue("");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(saveMock).not.toHaveBeenCalled();
    expect(w.find('[role="alert"]').text()).toBe("本文を入力してください。");
  });

  it("5,000 文字超は保存できず上限エラーを表示", async () => {
    const w = await mountForm();
    await body(w).setValue("あ".repeat(5001));
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(saveMock).not.toHaveBeenCalled();
    expect(w.find('[role="alert"]').text()).toBe("5,000 文字以内で入力してください。");
    expect(w.find('[data-testid="template-counter"]').text()).toContain("1 文字オーバー");
  });

  it("保存成功で保存 API を呼び、最終更新日時を更新", async () => {
    saveMock.mockResolvedValue(
      ok({ ...TEMPLATE, body: "新本文", updatedAt: "2026-10-30T01:00:00Z" }),
    );
    const w = await mountForm();
    await body(w).setValue("新本文");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(saveMock).toHaveBeenCalledWith("line", "新本文", ADMIN);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "告知テンプレートを保存しました" }),
    );
    expect(w.find('[data-testid="template-updated-at"]').text()).toBe(
      "最終更新: 2026/10/30 10:00",
    );
  });

  it("保存失敗でエラートーストを出し、入力内容を保持", async () => {
    saveMock.mockResolvedValue(err({ code: "NETWORK_ERROR", message: "x" }));
    const w = await mountForm();
    await body(w).setValue("編集中");
    await w.find("form").trigger("submit");
    await flushPromises();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
    expect((body(w).element as HTMLTextAreaElement).value).toBe("編集中");
  });
});
