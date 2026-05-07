import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import {
  unsafeEventId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import type { MyReservationItem } from "@/entities/reservation";
import HistoryRow from "./HistoryRow.vue";

function makeItem(
  status: MyReservationItem["status"],
  overrides: Partial<MyReservationItem["event"]> = {},
): MyReservationItem {
  void unsafeVenueId("00000000-0000-0000-0000-aaaaaaaaaaaa");
  return {
    id: unsafeReservationId("0a8f2d3c-1234-5678-90ab-cdef01234567"),
    status,
    guestCount: 0,
    cancelledAt: null,
    event: {
      id: unsafeEventId("00000000-0000-0000-0000-eeeeeeeeeeee"),
      name: "ゆる練 vol.43",
      startAt: "2026-05-12T19:30:00+09:00",
      endAt: "2026-05-12T21:30:00+09:00",
      fee: null,
      venueName: "亀戸スポーツセンター",
      ...overrides,
    },
  };
}

describe("HistoryRow", () => {
  it("日付セル / イベント名 / 会場 + 時間 / 予約番号 / バッジを表示する", () => {
    const wrapper = mount(HistoryRow, {
      props: { item: makeItem("reserved") },
    });
    expect(wrapper.text()).toContain("05/12");
    expect(wrapper.text()).toContain("ゆる練 vol.43");
    expect(wrapper.text()).toContain("亀戸スポーツセンター");
    expect(wrapper.text()).toContain("19:30–21:30");
    expect(wrapper.text()).toContain("#HQ-");
    expect(wrapper.text()).toContain("予約中");
  });

  it("status='cancelled' でタイトルが line-through + muted 表示", () => {
    const wrapper = mount(HistoryRow, {
      props: { item: makeItem("cancelled") },
    });
    const title = wrapper.get('[data-testid="history-row-title"]');
    expect(title.classes()).toContain("line-through");
    expect(title.classes()).toContain("text-muted");
  });

  it("status='attended' ではタイトルに line-through が付かない", () => {
    const wrapper = mount(HistoryRow, {
      props: { item: makeItem("attended") },
    });
    const title = wrapper.get('[data-testid="history-row-title"]');
    expect(title.classes()).not.toContain("line-through");
  });

  it("行は <article> として描画され、<router-link> や <a> ではない (非リンク)", () => {
    const wrapper = mount(HistoryRow, {
      props: { item: makeItem("reserved") },
    });
    expect(wrapper.element.tagName).toBe("ARTICLE");
    expect(wrapper.find("a").exists()).toBe(false);
  });

  it("showCancel=true でキャンセルボタンが描画され、押下で request-cancel emit", async () => {
    const item = makeItem("reserved");
    const wrapper = mount(HistoryRow, {
      props: { item, showCancel: true },
    });
    const btn = wrapper.get('[data-testid="history-row-cancel"]');
    await btn.trigger("click");
    expect(wrapper.emitted("request-cancel")).toEqual([[item]]);
  });

  it("showCancel 未指定 (false) でキャンセルボタンが描画されない", () => {
    const wrapper = mount(HistoryRow, {
      props: { item: makeItem("reserved") },
    });
    expect(wrapper.find('[data-testid="history-row-cancel"]').exists()).toBe(
      false,
    );
  });
});
