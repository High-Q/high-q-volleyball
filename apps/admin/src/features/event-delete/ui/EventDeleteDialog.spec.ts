import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

const {
  deleteEventMock,
  classifyEventReservationsMock,
  fetchActiveReservationRecipientsMock,
  fetchEventCancellationMetaMock,
  triggerEventCancellationNotificationMock,
  toastMock,
} = vi.hoisted(() => ({
  deleteEventMock: vi.fn(),
  classifyEventReservationsMock: vi.fn(),
  fetchActiveReservationRecipientsMock: vi.fn(),
  fetchEventCancellationMetaMock: vi.fn(),
  triggerEventCancellationNotificationMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@/entities/event", () => ({
  deleteEvent: deleteEventMock,
  classifyEventReservations: classifyEventReservationsMock,
  fetchActiveReservationRecipients: fetchActiveReservationRecipientsMock,
  fetchEventCancellationMeta: fetchEventCancellationMetaMock,
}));

vi.mock("@/shared/api/event-cancellation-notification", () => ({
  triggerEventCancellationNotification:
    triggerEventCancellationNotificationMock,
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

const EMPTY_BREAKDOWN = {
  reserved: 0,
  attended: 0,
  cancelled: 0,
  no_show: 0,
  waitlist: 0,
};

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", component: { template: "<div>list</div>" } },
      { path: "/events/:id/edit", component: { template: "<div>edit</div>" } },
    ],
  });
}

async function openDialog(): Promise<VueWrapper> {
  const router = buildRouter();
  await router.push(`/events/${EVENT_ID}/edit`);
  const wrapper = mount(EventDeleteDialog, {
    props: { eventId: EVENT_ID, eventName: "ゆる練 vol.42" },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await wrapper.find("button").trigger("click");
  await flushPromises();
  return wrapper;
}

function findConfirmButton(): HTMLButtonElement | undefined {
  const all = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      '[role="alertdialog"] button',
    ),
  );
  return all.find((b) => b.textContent?.includes("削除する"));
}

let wrapper: VueWrapper | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  toastMock.mockReset();
  classifyEventReservationsMock.mockResolvedValue({
    ok: true,
    value: EMPTY_BREAKDOWN,
  });
  fetchActiveReservationRecipientsMock.mockResolvedValue({
    ok: true,
    value: [],
  });
  fetchEventCancellationMetaMock.mockResolvedValue({
    ok: true,
    value: {
      eventName: "ゆる練 vol.42",
      startAtIso: "2026-05-22T19:30:00+09:00",
      venueName: "新宿スポーツセンター",
    },
  });
  triggerEventCancellationNotificationMock.mockResolvedValue(undefined);
});

afterEach(() => {
  if (wrapper) {
    wrapper.unmount();
    wrapper = null;
  }
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("EventDeleteDialog", () => {
  it("初期状態では Dialog は閉じている", async () => {
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

  it("trigger を押すと Dialog が開きタイトルとイベント名が描画される", async () => {
    wrapper = await openDialog();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("このイベントを削除しますか？");
    expect(document.body.textContent).toContain("ゆる練 vol.42");
  });

  it("breakdown 取得中はローディング表示 + 削除ボタン disabled", async () => {
    // classify が解決しないモック
    let resolveFn: (v: unknown) => void;
    classifyEventReservationsMock.mockImplementation(
      () =>
        new Promise((r) => {
          resolveFn = r;
        }),
    );
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    wrapper = mount(EventDeleteDialog, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click");
    await flushPromises();
    expect(document.querySelector('[data-testid="breakdown-loading"]')).not.toBeNull();
    expect(findConfirmButton()?.disabled).toBe(true);
    resolveFn!({ ok: true, value: EMPTY_BREAKDOWN });
    await flushPromises();
  });

  it("予約 0 件は「予約はありません」+ 削除ボタン活性", async () => {
    wrapper = await openDialog();
    expect(
      document.querySelector('[data-testid="breakdown-empty"]'),
    ).not.toBeNull();
    expect(findConfirmButton()?.disabled).toBe(false);
  });

  it("キャンセル済のみは「キャンセル済 N 件も整理されます」+ 削除ボタン活性", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: true,
      value: { ...EMPTY_BREAKDOWN, cancelled: 2, no_show: 1 },
    });
    wrapper = await openDialog();
    const summary = document.querySelector('[data-testid="breakdown-summary"]');
    expect(summary).not.toBeNull();
    expect(summary!.textContent).toContain("3");
    expect(summary!.textContent).toMatch(/キャンセル|履歴/);
    expect(findConfirmButton()?.disabled).toBe(false);
  });

  it("有効予約あり: 件数 + 「キャンセル通知メールを自動で送信します」を表示・削除ボタン活性 + 主催者メッセージ textarea 表示", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: true,
      value: { ...EMPTY_BREAKDOWN, reserved: 3, attended: 1, cancelled: 2 },
    });
    wrapper = await openDialog();
    const summary = document.querySelector('[data-testid="breakdown-summary"]');
    expect(summary!.textContent).toContain("4");
    expect(
      document.querySelector('[data-testid="breakdown-warn-active"]'),
    ).not.toBeNull();
    expect(document.body.textContent).toContain(
      "対象の予約者にはキャンセル通知メールを自動で送信します",
    );
    expect(document.body.textContent).not.toContain(
      "予約者には別途ご連絡ください",
    );
    const textarea = document.querySelector('[data-testid="organizer-message"]');
    expect(textarea).not.toBeNull();
    expect(textarea!.getAttribute("maxlength")).toBe("500");
    expect(findConfirmButton()?.disabled).toBe(false);
  });

  it("有効予約 0 件のときは主催者メッセージ textarea を表示しない", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: true,
      value: { ...EMPTY_BREAKDOWN, cancelled: 2 },
    });
    wrapper = await openDialog();
    expect(
      document.querySelector('[data-testid="organizer-message"]'),
    ).toBeNull();
  });

  it("有効予約あり: メール本文プレビューが表示され、件名にイベント名が含まれる", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: true,
      value: { ...EMPTY_BREAKDOWN, reserved: 2 },
    });
    wrapper = await openDialog();
    const preview = document.querySelector('[data-testid="mail-preview"]');
    expect(preview).not.toBeNull();
    const subject = document.querySelector(
      '[data-testid="mail-preview-subject"]',
    );
    expect(subject?.textContent).toContain("イベント中止のお知らせ");
    expect(subject?.textContent).toContain("ゆる練 vol.42");
    const body = document.querySelector('[data-testid="mail-preview-body"]');
    expect(body?.textContent).toContain("新宿スポーツセンター");
    // メッセージ未入力時は本文に主催者からのお知らせ欄が描画されない
    expect(body?.textContent).not.toContain("主催者からのお知らせ:");
  });

  it("主催者メッセージ入力時にプレビュー本文へ理由欄が反応する", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: true,
      value: { ...EMPTY_BREAKDOWN, reserved: 1 },
    });
    wrapper = await openDialog();
    const textarea = document.querySelector(
      '[data-testid="organizer-message"]',
    ) as HTMLTextAreaElement;
    textarea.value = "雨天中止のためキャンセルします";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await flushPromises();
    const body = document.querySelector('[data-testid="mail-preview-body"]');
    expect(body?.textContent).toContain("主催者からのお知らせ:");
    expect(body?.textContent).toContain("雨天中止のためキャンセルします");
  });

  it("event meta 取得失敗時はプレビューを描画しない", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: true,
      value: { ...EMPTY_BREAKDOWN, reserved: 2 },
    });
    fetchEventCancellationMetaMock.mockResolvedValue({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "rls" },
    });
    wrapper = await openDialog();
    expect(document.querySelector('[data-testid="mail-preview"]')).toBeNull();
    // textarea 自体は引き続き表示される
    expect(
      document.querySelector('[data-testid="organizer-message"]'),
    ).not.toBeNull();
  });

  it("breakdown 取得失敗: role='alert' でエラー表示 + 削除ボタン disabled", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "rls" },
    });
    wrapper = await openDialog();
    expect(
      document.querySelector('[data-testid="breakdown-error"]'),
    ).not.toBeNull();
    expect(findConfirmButton()?.disabled).toBe(true);
  });

  it("「削除する」を押すと deleteEvent → Toast → /events redirect", async () => {
    deleteEventMock.mockResolvedValue({ ok: true, value: undefined });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    const pushSpy = vi.spyOn(router, "push");
    wrapper = mount(EventDeleteDialog, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click");
    await flushPromises();
    findConfirmButton()!.click();
    await flushPromises();
    expect(deleteEventMock).toHaveBeenCalledWith(EVENT_ID);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "削除しました" }),
    );
    expect(pushSpy).toHaveBeenCalledWith("/events");
  });

  it("「キャンセル」を押すと Dialog が閉じる（API 呼ばない）", async () => {
    wrapper = await openDialog();
    const cancelBtn = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[role="alertdialog"] button',
      ),
    ).find((b) => b.textContent?.includes("キャンセル"));
    cancelBtn!.click();
    await flushPromises();
    expect(deleteEventMock).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it("削除失敗時は Dialog が閉じず role='alert' のメッセージが表示される", async () => {
    deleteEventMock.mockResolvedValue({
      ok: false,
      error: { code: "SERVER_ERROR", message: "boom" },
    });
    wrapper = await openDialog();
    findConfirmButton()!.click();
    await flushPromises();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    const alerts = document.querySelectorAll('[role="alert"]');
    const texts = Array.from(alerts).map((a) => a.textContent ?? "");
    expect(texts.some((t) => t.includes("サーバーエラー"))).toBe(true);
  });
});
