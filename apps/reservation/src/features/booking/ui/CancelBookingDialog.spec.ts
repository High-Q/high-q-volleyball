import { afterEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CancelBookingDialog from "./CancelBookingDialog.vue";

// 開催が「過去」になる開始時刻 (通常予約なら日付ゲートで取り消し不可になる)
const PAST_START = "2020-01-01T00:00:00Z";

function findInBody(selector: string): HTMLElement | null {
  return document.body.querySelector(selector) as HTMLElement | null;
}

/** radix の teleport が body に描画されるのを待つ */
function flushTeleport(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CancelBookingDialog - kind='waitlist' (日付ゲートなし)", () => {
  it("過去開催でも常に取り消し可能 (confirm ボタンが描画される)", async () => {
    mount(CancelBookingDialog, {
      props: { open: true, eventStartAt: PAST_START, kind: "waitlist" },
      attachTo: document.body,
    });
    await flushTeleport();
    expect(findInBody('[data-testid="confirm-cancel"]')).not.toBeNull();
    expect(document.body.textContent ?? "").toContain(
      "キャンセル待ちを取り消しますか？",
    );
    expect(findInBody('[data-testid="confirm-cancel"]')?.textContent).toContain(
      "取り消す",
    );
  });

  it("confirm 押下で confirm を emit する", async () => {
    const wrapper = mount(CancelBookingDialog, {
      props: { open: true, eventStartAt: PAST_START, kind: "waitlist" },
      attachTo: document.body,
    });
    await flushTeleport();
    const confirm = findInBody('[data-testid="confirm-cancel"]');
    confirm?.click();
    expect(wrapper.emitted("confirm")).toHaveLength(1);
  });
});

describe("CancelBookingDialog - kind='reservation' (既定・日付ゲート適用)", () => {
  it("過去開催では日付ゲートで confirm ボタンが描画されない", async () => {
    mount(CancelBookingDialog, {
      props: { open: true, eventStartAt: PAST_START },
      attachTo: document.body,
    });
    await flushTeleport();
    expect(findInBody('[data-testid="confirm-cancel"]')).toBeNull();
    expect(document.body.textContent ?? "").toContain(
      "キャンセル期限を過ぎています",
    );
  });
});
