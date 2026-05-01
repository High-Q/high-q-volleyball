import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

const { deleteEventMock, toastMock } = vi.hoisted(() => ({
  deleteEventMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@/entities/event", () => ({
  deleteEvent: deleteEventMock,
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({
    toast: toastMock,
    toasts: { value: [] },
    dismiss: vi.fn(),
  }),
}));

import EventDeleteDialog from "./EventDeleteDialog.vue";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", component: { template: "<div>list</div>" } },
      { path: "/events/:id/edit", component: { template: "<div>edit</div>" } },
    ],
  });
}

let wrapper: VueWrapper | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  toastMock.mockReset();
});

afterEach(() => {
  if (wrapper) {
    wrapper.unmount();
    wrapper = null;
  }
  // radix-vue Portal がドキュメントに残す要素を念のためクリア
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("EventDeleteDialog", () => {
  it("初期状態では Dialog は閉じている (alertdialog 不在)", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    wrapper = mount(EventDeleteDialog, {
      props: { eventId: EVENT_ID, eventName: "ゆる練 vol.42" },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("trigger slot のボタンを押すと Dialog が開き、role='alertdialog' + タイトルが描画される", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    wrapper = mount(EventDeleteDialog, {
      props: { eventId: EVENT_ID, eventName: "ゆる練 vol.42" },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(document.body.textContent).toContain("このイベントを削除しますか？");
    expect(document.body.textContent).toContain("ゆる練 vol.42");
  });

  it("「削除する」を押すと deleteEvent が呼ばれ、router.push('/events') される", async () => {
    deleteEventMock.mockResolvedValue({ ok: true, value: undefined });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    const pushSpy = vi.spyOn(router, "push");
    wrapper = mount(EventDeleteDialog, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click"); // 削除ボタン → 開く
    await flushPromises();
    // Dialog 内の「削除する」ボタンを押す
    const allButtons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'),
    );
    const confirmBtn = allButtons.find((b) => b.textContent?.includes("削除する"));
    expect(confirmBtn).toBeDefined();
    confirmBtn!.click();
    await flushPromises();
    expect(deleteEventMock).toHaveBeenCalledWith(EVENT_ID);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "削除しました" }),
    );
    expect(pushSpy).toHaveBeenCalledWith("/events");
  });

  it("「キャンセル」を押すと Dialog が閉じる（API 呼ばない）", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    wrapper = mount(EventDeleteDialog, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click"); // 開く
    await flushPromises();
    const cancelBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'),
    ).find((b) => b.textContent?.includes("キャンセル"));
    cancelBtn!.click();
    await flushPromises();
    expect(deleteEventMock).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("削除失敗時は Dialog が閉じず role='alert' のメッセージが表示される", async () => {
    deleteEventMock.mockResolvedValue({
      ok: false,
      error: { code: "RESERVATIONS_EXIST", message: "FK" },
    });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    wrapper = mount(EventDeleteDialog, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click");
    await flushPromises();
    const confirmBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'),
    ).find((b) => b.textContent?.includes("削除する"));
    confirmBtn!.click();
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    const alerts = document.querySelectorAll('[role="alert"]');
    const texts = Array.from(alerts).map((a) => a.textContent ?? "");
    expect(texts.some((t) => t.includes("予約があるため削除できません"))).toBe(
      true,
    );
  });
});
