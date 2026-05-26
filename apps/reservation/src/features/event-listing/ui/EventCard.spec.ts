import { describe, expect, it } from "vitest";
import { unsafeEventId, unsafeVenueId } from "@high-q/shared";
import { mountWithRouter } from "@/test/mountWithRouter";
import EventCard from "./EventCard.vue";
import type { EventListItem } from "@/entities/event";

const stubEvent: EventListItem = {
  id: unsafeEventId("11111111-1111-1111-1111-111111111111"),
  name: "ゆる練 vol.43",
  startAt: "2026-05-12T10:30:00Z", // JST 19:30
  endAt: "2026-05-12T12:30:00Z", // JST 21:30
  venueId: unsafeVenueId("22222222-2222-2222-2222-222222222222"),
  venueName: "亀戸スポーツセンター",
  fee: 1000,
  availability: null,
};

const routes = [
  { path: "/", component: { template: "<div />" } },
  {
    path: "/events/:id",
    name: "event-detail",
    component: { template: "<div>detail</div>" },
  },
];

describe("EventCard", () => {
  it("開催日・イベント名・会場名・時刻・参加費を描画する", async () => {
    const wrapper = await mountWithRouter(EventCard, routes, "/", {
      props: { event: stubEvent },
    });
    const text = wrapper.text();
    expect(text).toContain("2026年5月12日 (火)");
    expect(text).toContain("ゆる練 vol.43");
    expect(text).toContain("亀戸スポーツセンター");
    expect(text).toContain("19:30-21:30");
    expect(text).toContain("1,000 円");
  });

  it("カード押下で /events/:id に遷移する router-link を持つ", async () => {
    const wrapper = await mountWithRouter(EventCard, routes, "/", {
      props: { event: stubEvent },
    });
    const link = wrapper.findComponent({ name: "RouterLink" });
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toEqual({
      name: "event-detail",
      params: { id: stubEvent.id },
    });
  });

  it("集合場所は表示しない（一覧と詳細の差分要素のため詳細のみ）", async () => {
    const wrapper = await mountWithRouter(EventCard, routes, "/", {
      props: { event: stubEvent },
    });
    expect(wrapper.text()).not.toContain("MEETING POINT");
    expect(wrapper.text()).not.toContain("meetingPoint");
  });
});
