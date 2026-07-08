import { describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { defineComponent } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import {
  unsafeEventId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import type { MyReservationItem } from "@/entities/reservation";
import HistoryRow from "./HistoryRow.vue";

const RID = "0a8f2d3c-1234-5678-90ab-cdef01234567";
const Stub = defineComponent({ template: "<div />" });

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/history", name: "history", component: Stub },
      {
        path: "/reservations/:reservationId",
        name: "reservation-detail",
        component: Stub,
      },
    ],
  });
}

function makeItem(
  status: MyReservationItem["status"],
  overrides: Partial<MyReservationItem["event"]> = {},
): MyReservationItem {
  void unsafeVenueId("00000000-0000-0000-0000-aaaaaaaaaaaa");
  return {
    id: unsafeReservationId(RID),
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
      vol: null,
      availability: null,
      ...overrides,
    },
  };
}

async function mountRow(props: {
  item: MyReservationItem;
  showCancel?: boolean;
  now?: Date;
}) {
  const router = buildRouter();
  await router.push("/history");
  await router.isReady();
  const wrapper = mount(HistoryRow, {
    props,
    global: { plugins: [router] },
  });
  return { wrapper, router };
}

const NOW = new Date("2026-05-07T09:00:00+09:00");
const FUTURE = "2026-05-20T19:00:00+09:00";
const PAST = "2026-05-01T19:00:00+09:00";

function availability(capacity: number | null, reservedCount: number) {
  return {
    eventId: unsafeEventId("00000000-0000-0000-0000-eeeeeeeeeeee"),
    capacity,
    reservedCount,
  };
}

describe("HistoryRow", () => {
  it("日付セル / イベント名 / 会場 + 時間 / 予約番号 / バッジを表示する", async () => {
    const { wrapper } = await mountRow({ item: makeItem("reserved") });
    expect(wrapper.text()).toContain("05/12");
    expect(wrapper.text()).toContain("ゆる練 vol.43");
    expect(wrapper.text()).toContain("亀戸スポーツセンター");
    expect(wrapper.text()).toContain("19:30–21:30");
    expect(wrapper.text()).toContain("#HQ-");
    expect(wrapper.text()).toContain("予約中");
  });

  it("status='cancelled' でタイトルが line-through + muted 表示", async () => {
    const { wrapper } = await mountRow({ item: makeItem("cancelled") });
    const title = wrapper.get('[data-testid="history-row-title"]');
    expect(title.classes()).toContain("line-through");
    expect(title.classes()).toContain("text-muted");
  });

  it("status='attended' ではタイトルに line-through が付かない", async () => {
    const { wrapper } = await mountRow({ item: makeItem("attended") });
    const title = wrapper.get('[data-testid="history-row-title"]');
    expect(title.classes()).not.toContain("line-through");
  });

  it("行は <a> (router-link) として描画され /reservations/<id> を href に持つ", async () => {
    const { wrapper } = await mountRow({ item: makeItem("reserved") });
    expect(wrapper.element.tagName).toBe("A");
    expect(wrapper.attributes("href")).toBe(`/reservations/${RID}`);
  });

  it("行押下で /reservations/:reservationId へ遷移する", async () => {
    const { wrapper, router } = await mountRow({
      item: makeItem("reserved"),
    });
    await wrapper.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("reservation-detail");
    expect(router.currentRoute.value.params.reservationId).toBe(RID);
  });

  it("showCancel=true でキャンセルボタンが描画され、押下で request-cancel emit (router-link への伝播は抑制)", async () => {
    const item = makeItem("reserved");
    const { wrapper, router } = await mountRow({ item, showCancel: true });
    const btn = wrapper.get('[data-testid="history-row-cancel"]');
    await btn.trigger("click");
    expect(wrapper.emitted("request-cancel")).toEqual([[item]]);
    // 親 router-link への伝播抑制 → URL は /history のまま変わらない
    expect(router.currentRoute.value.name).toBe("history");
  });

  it("showCancel 未指定 (false) でキャンセルボタンが描画されない", async () => {
    const { wrapper } = await mountRow({ item: makeItem("reserved") });
    expect(wrapper.find('[data-testid="history-row-cancel"]').exists()).toBe(
      false,
    );
  });

  it("cancelled × 未開催 × 非満席 で「再予約する」CTA が描画され、押下で request-rebook emit (router-link への伝播は抑制)", async () => {
    const item = makeItem("cancelled", { startAt: FUTURE, endAt: FUTURE });
    const { wrapper, router } = await mountRow({ item, now: NOW });
    const btn = wrapper.get('[data-testid="history-row-rebook"]');
    await btn.trigger("click");
    expect(wrapper.emitted("request-rebook")).toEqual([[item]]);
    // 親 router-link への伝播抑制 → URL は /history のまま
    expect(router.currentRoute.value.name).toBe("history");
  });

  it("cancelled × 開催済（受付終了）では「再予約する」CTA が描画されない", async () => {
    const item = makeItem("cancelled", { startAt: PAST, endAt: PAST });
    const { wrapper } = await mountRow({ item, now: NOW });
    expect(wrapper.find('[data-testid="history-row-rebook"]').exists()).toBe(
      false,
    );
  });

  it("cancelled × 未開催 × 満席 では「再予約する」CTA が描画されない", async () => {
    const item = makeItem("cancelled", {
      startAt: FUTURE,
      endAt: FUTURE,
      availability: availability(10, 10),
    });
    const { wrapper } = await mountRow({ item, now: NOW });
    expect(wrapper.find('[data-testid="history-row-rebook"]').exists()).toBe(
      false,
    );
  });

  it("非 cancelled 行には「再予約する」CTA が描画されない", async () => {
    const item = makeItem("attended", { startAt: FUTURE, endAt: FUTURE });
    const { wrapper } = await mountRow({ item, now: NOW });
    expect(wrapper.find('[data-testid="history-row-rebook"]').exists()).toBe(
      false,
    );
  });
});
