import { describe, expect, it } from "vitest";
import { unsafeEventId, unsafeVenueId } from "@high-q/shared";
import { mountWithRouter } from "@/test/mountWithRouter";
import EventRow from "./EventRow.vue";
import type { EventListItem } from "@/entities/event";

const stubEvent: EventListItem = {
  id: unsafeEventId("11111111-1111-1111-1111-111111111111"),
  name: "ゆる練 vol.43",
  startAt: "2026-05-12T10:30:00Z", // JST 火 19:30
  endAt: "2026-05-12T12:30:00Z", // JST 21:30
  venueId: unsafeVenueId("22222222-2222-2222-2222-222222222222"),
  venueName: "亀戸スポーツセンター",
  fee: 1000,
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
      props: { event: stubEvent },
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
      props: { event: stubEvent },
    });
    const link = wrapper.findComponent({ name: "RouterLink" });
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toEqual({
      name: "event-detail",
      params: { id: stubEvent.id },
    });
  });

  it("満員 / 経験レベル / 残席数のバッジは描画されない (MVP1 スコープオフ)", async () => {
    const wrapper = await mountWithRouter(EventRow, routes, "/", {
      props: { event: stubEvent },
    });
    const text = wrapper.text();
    expect(text).not.toContain("満員");
    expect(text).not.toContain("初心者");
    expect(text).not.toContain("残席");
  });

  it("会場名は表示しない (一覧との混同を避けるため EventRow ではイベント名 + 時刻 + 参加費のみ)", async () => {
    const wrapper = await mountWithRouter(EventRow, routes, "/", {
      props: { event: stubEvent },
    });
    expect(wrapper.text()).not.toContain("亀戸スポーツセンター");
  });
});
