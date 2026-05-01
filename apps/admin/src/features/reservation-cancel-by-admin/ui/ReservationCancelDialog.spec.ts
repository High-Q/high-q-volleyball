import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReservationId } from "@high-q/shared";

const { cancelByAdminMock, toastMock } = vi.hoisted(() => ({
  cancelByAdminMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@/entities/reservation", () => ({
  cancelByAdmin: cancelByAdminMock,
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({
    toast: toastMock,
    toasts: { value: [] },
    dismiss: vi.fn(),
  }),
}));

import ReservationCancelDialog from "./ReservationCancelDialog.vue";

const RID = "00000000-0000-0000-0000-00000000a001" as unknown as ReservationId;
let wrapper: VueWrapper | null = null;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("ReservationCancelDialog — トリガーボタン", () => {
  it("デフォルトトリガー（slot 未提供）が「キャンセル代行」ボタンを描画", () => {
    wrapper = mount(ReservationCancelDialog, {
      props: { reservationId: RID, memberName: "田中 美咲" },
      attachTo: document.body,
    });
    const trigger = wrapper.find('button[type="button"]');
    expect(trigger.exists()).toBe(true);
    expect(trigger.text()).toContain("キャンセル代行");
    expect(trigger.attributes("aria-label")).toBe(
      "田中 美咲 の予約をキャンセル",
    );
  });
});

describe("ReservationCancelDialog — open / 描画", () => {
  it("トリガークリックで Dialog が開き、説明文に member 名を含む", async () => {
    wrapper = mount(ReservationCancelDialog, {
      props: { reservationId: RID, memberName: "田中 美咲" },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click");
    await flushPromises();

    // radix-vue の AlertDialog は body 直下に描画される
    const description = document.body.querySelector(
      '[role="alertdialog"], [role="dialog"]',
    );
    expect(description?.textContent).toContain("田中 美咲");
    expect(description?.textContent).toContain(
      "この操作は元に戻せません",
    );
  });
});

describe("ReservationCancelDialog — 確定 / キャンセル", () => {
  it("「予約を取消」確定で cancelByAdmin が呼ばれ、cancelled イベントが発火", async () => {
    cancelByAdminMock.mockResolvedValue({ ok: true, value: undefined });
    wrapper = mount(ReservationCancelDialog, {
      props: { reservationId: RID, memberName: "田中" },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click");
    await flushPromises();

    const confirmBtn = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("予約を取消"));
    expect(confirmBtn).toBeDefined();
    confirmBtn!.click();
    await flushPromises();

    expect(cancelByAdminMock).toHaveBeenCalledWith(RID);
    expect(wrapper.emitted("cancelled")).toHaveLength(1);
  });

  it("「キャンセル」ボタンで mutation を発火せず Dialog を閉じる", async () => {
    wrapper = mount(ReservationCancelDialog, {
      props: { reservationId: RID, memberName: "田中" },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click");
    await flushPromises();

    const cancelBtn = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.trim() === "キャンセル");
    cancelBtn!.click();
    await flushPromises();

    expect(cancelByAdminMock).not.toHaveBeenCalled();
    expect(wrapper.emitted("cancelled")).toBeUndefined();
  });
});

describe("ReservationCancelDialog — 失敗時の inline error", () => {
  it("失敗時に inline error が描画され、Dialog は閉じない", async () => {
    cancelByAdminMock.mockResolvedValue({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "" },
    });
    wrapper = mount(ReservationCancelDialog, {
      props: { reservationId: RID, memberName: "田中" },
      attachTo: document.body,
    });
    await wrapper.find("button").trigger("click");
    await flushPromises();

    const confirmBtn = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("予約を取消"));
    confirmBtn!.click();
    await flushPromises();

    const alert = document.body.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("通信に失敗");
    expect(wrapper.emitted("cancelled")).toBeUndefined();
  });
});
