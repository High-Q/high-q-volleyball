import { describe, expect, it } from "vitest";
import { unsafeEventId, unsafeVenueId } from "@high-q/shared";
import { mountWithRouter } from "@/test/mountWithRouter";
import EventRow from "./EventRow.vue";
import type { EventAvailability, EventListItem } from "@/entities/event";

const EV_ID = unsafeEventId("11111111-1111-1111-1111-111111111111");
const V_ID = unsafeVenueId("22222222-2222-2222-2222-222222222222");

function makeAvailability(
  capacity: number | null,
  reservedCount: number,
): EventAvailability {
  return { eventId: EV_ID, capacity, reservedCount };
}

const baseEvent: EventListItem = {
  id: EV_ID,
  name: "ゆる練 vol.43",
  startAt: "2026-05-12T10:30:00Z", // JST 火 19:30
  endAt: "2026-05-12T12:30:00Z", // JST 21:30
  venueId: V_ID,
  venueName: "亀戸スポーツセンター",
  fee: 1000,
  availability: makeAvailability(null, 11),
};

const routes = [
  { path: "/", component: { template: "<div />" } },
  {
    path: "/events/:id",
    name: "event-detail",
    component: { template: "<div>detail</div>" },
  },
];

describe("EventRow", () => {
  it("月日 / 曜日 / イベント名 / 時刻 / 参加費を描画する", async () => {
    const wrapper = await mountWithRouter(EventRow, routes, "/", {
      props: { event: baseEvent },
    });
    expect(wrapper.get('[data-testid="event-row-date"]').text()).toBe("05 / 12");
    expect(wrapper.get('[data-testid="event-row-weekday"]').text()).toBe("火");
    expect(wrapper.get('[data-testid="event-row-name"]').text()).toBe(
      "ゆる練 vol.43",
    );
    expect(wrapper.get('[data-testid="event-row-time"]').text()).toBe(
      "19:30-21:30",
    );
    expect(wrapper.get('[data-testid="event-row-fee"]').text()).toBe("1,000 円");
  });

  it("行押下で /events/:id への router-link を持つ", async () => {
    const wrapper = await mountWithRouter(EventRow, routes, "/", {
      props: { event: baseEvent },
    });
    const link = wrapper.findComponent({ name: "RouterLink" });
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toEqual({
      name: "event-detail",
      params: { id: baseEvent.id },
    });
  });

  it("経験レベルバッジは描画されない (MVP1 スコープオフ)", async () => {
    const wrapper = await mountWithRouter(EventRow, routes, "/", {
      props: { event: baseEvent },
    });
    expect(wrapper.text()).not.toContain("初心者");
  });

  it("会場名は表示しない (一覧との混同を避けるため EventRow ではイベント名 + 時刻 + 参加費 + 予約埋まり具合チップのみ)", async () => {
    const wrapper = await mountWithRouter(EventRow, routes, "/", {
      props: { event: baseEvent },
    });
    expect(wrapper.text()).not.toContain("亀戸スポーツセンター");
  });

  it("「席」表記は使われない", async () => {
    const wrapper = await mountWithRouter(EventRow, routes, "/", {
      props: { event: { ...baseEvent, availability: makeAvailability(18, 11) } },
    });
    expect(wrapper.text()).not.toMatch(/席/);
  });

  describe("予約埋まり具合チップ", () => {
    it("capacity NULL × 予約 11 名 → 「11 名 予約中」", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: { ...baseEvent, availability: makeAvailability(null, 11) } },
      });
      expect(wrapper.get('[data-testid="availability-chip"]').text()).toBe(
        "11 名 予約中",
      );
    });

    it("capacity あり残あり → 「あと N 名 募集」", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: { ...baseEvent, availability: makeAvailability(18, 11) } },
      });
      expect(wrapper.get('[data-testid="availability-chip"]').text()).toBe(
        "あと 7 名 募集",
      );
    });

    it("満員 → 「満員」", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: { ...baseEvent, availability: makeAvailability(18, 18) } },
      });
      expect(wrapper.get('[data-testid="availability-chip"]').text()).toBe(
        "満員",
      );
    });

    it("availabilityLoading=true → shimmer プレースホルダ", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: {
          event: { ...baseEvent, availability: null },
          availabilityLoading: true,
        },
      });
      expect(
        wrapper.find('[data-testid="availability-chip-loading"]').exists(),
      ).toBe(true);
    });

    it("availability=null (取得失敗) → 「—」 fallback、主データは継続描画", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: { ...baseEvent, availability: null } },
      });
      expect(wrapper.get('[data-testid="availability-chip"]').text()).toBe("—");
      expect(wrapper.get('[data-testid="event-row-name"]').text()).toBe(
        "ゆる練 vol.43",
      );
      expect(wrapper.get('[data-testid="event-row-fee"]').text()).toBe("1,000 円");
    });
  });
});
