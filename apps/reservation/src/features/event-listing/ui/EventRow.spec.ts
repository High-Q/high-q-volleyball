import { describe, expect, it } from "vitest";
import {
  unsafeEventId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import { mountWithRouter } from "@/test/mountWithRouter";
import EventRow from "./EventRow.vue";
import type { EventAvailability, EventListItem } from "@/entities/event";

const EV_ID = unsafeEventId("11111111-1111-1111-1111-111111111111");
const V_ID = unsafeVenueId("22222222-2222-2222-2222-222222222222");
const R_ID = unsafeReservationId("33333333-3333-3333-3333-333333333333");

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
  vol: null,
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
  {
    path: "/reservations/:reservationId",
    name: "reservation-detail",
    component: { template: "<div>reservation</div>" },
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

  describe("自分予約あり時の挙動 (reservationId 渡し)", () => {
    it("reservationId 未指定: router-link は /events/:id を指す (従来挙動)", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: baseEvent },
      });
      const link = wrapper.findComponent({ name: "RouterLink" });
      expect(link.props("to")).toEqual({
        name: "event-detail",
        params: { id: baseEvent.id },
      });
    });

    it("reservationId = null: router-link は /events/:id を指す (従来挙動)", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: baseEvent, reservationId: null },
      });
      const link = wrapper.findComponent({ name: "RouterLink" });
      expect(link.props("to")).toEqual({
        name: "event-detail",
        params: { id: baseEvent.id },
      });
    });

    it("reservationId 指定時: router-link は /reservations/:reservationId を指す", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: baseEvent, reservationId: R_ID },
      });
      const link = wrapper.findComponent({ name: "RouterLink" });
      expect(link.props("to")).toEqual({
        name: "reservation-detail",
        params: { reservationId: R_ID },
      });
    });

    it("reservationId 未指定: 「予約済」 chip は描画されない", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: baseEvent },
      });
      expect(
        wrapper.find('[data-testid="event-row-mine-badge"]').exists(),
      ).toBe(false);
    });

    it("reservationId = null: 「予約済」 chip は描画されない", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: baseEvent, reservationId: null },
      });
      expect(
        wrapper.find('[data-testid="event-row-mine-badge"]').exists(),
      ).toBe(false);
    });

    it("reservationId 指定時: 「予約済」 chip が描画される", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: baseEvent, reservationId: R_ID },
      });
      const badge = wrapper.get('[data-testid="event-row-mine-badge"]');
      expect(badge.text()).toContain("予約済");
    });
  });

  describe("キャンセル待ち登録時の挙動 (waitlistReservationId 渡し)", () => {
    const WL_ID = unsafeReservationId("44444444-4444-4444-4444-444444444444");

    it("waitlistReservationId 指定時: 「キャンセル待ち」 chip が描画される", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: baseEvent, waitlistReservationId: WL_ID },
      });
      const badge = wrapper.get('[data-testid="event-row-waitlist-badge"]');
      expect(badge.text()).toContain("キャンセル待ち");
      expect(
        wrapper.find('[data-testid="event-row-mine-badge"]').exists(),
      ).toBe(false);
    });

    it("waitlistReservationId 指定時: router-link は /reservations/:reservationId を指す", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: baseEvent, waitlistReservationId: WL_ID },
      });
      const link = wrapper.findComponent({ name: "RouterLink" });
      expect(link.props("to")).toEqual({
        name: "reservation-detail",
        params: { reservationId: WL_ID },
      });
    });

    it("予約済 (reservationId) が waitlist より優先される", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: {
          event: baseEvent,
          reservationId: R_ID,
          waitlistReservationId: WL_ID,
        },
      });
      expect(wrapper.get('[data-testid="event-row-mine-badge"]').text()).toContain(
        "予約済",
      );
      expect(
        wrapper.find('[data-testid="event-row-waitlist-badge"]').exists(),
      ).toBe(false);
    });

    it("waitlistReservationId 未指定: 「キャンセル待ち」 chip は描画されない", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: baseEvent },
      });
      expect(
        wrapper.find('[data-testid="event-row-waitlist-badge"]').exists(),
      ).toBe(false);
    });
  });

  describe("満員時のキャンセル待ち受付ヒント", () => {
    const fullEvent: EventListItem = {
      ...baseEvent,
      availability: makeAvailability(18, 18),
    };
    const WL_ID = unsafeReservationId("55555555-5555-5555-5555-555555555555");

    it("満員 + 未登録: 「キャンセル待ち受付中」ヒントが描画される", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: fullEvent },
      });
      const hint = wrapper.get('[data-testid="event-row-waitlist-hint"]');
      expect(hint.text()).toContain("キャンセル待ち受付中");
    });

    it("満員でない (残あり): ヒントは描画されない", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: { ...baseEvent, availability: makeAvailability(18, 11) } },
      });
      expect(
        wrapper.find('[data-testid="event-row-waitlist-hint"]').exists(),
      ).toBe(false);
    });

    it("capacity NULL: ヒントは描画されない", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: { ...baseEvent, availability: makeAvailability(null, 30) } },
      });
      expect(
        wrapper.find('[data-testid="event-row-waitlist-hint"]').exists(),
      ).toBe(false);
    });

    it("満員 + キャンセル待ち登録済み: ヒントは出ず「キャンセル待ち」バッジが出る", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: fullEvent, waitlistReservationId: WL_ID },
      });
      expect(
        wrapper.find('[data-testid="event-row-waitlist-hint"]').exists(),
      ).toBe(false);
      expect(
        wrapper.find('[data-testid="event-row-waitlist-badge"]').exists(),
      ).toBe(true);
    });

    it("満員 + 予約済み: ヒントは出ず「予約済」バッジが出る", async () => {
      const wrapper = await mountWithRouter(EventRow, routes, "/", {
        props: { event: fullEvent, reservationId: R_ID },
      });
      expect(
        wrapper.find('[data-testid="event-row-waitlist-hint"]').exists(),
      ).toBe(false);
      expect(
        wrapper.find('[data-testid="event-row-mine-badge"]').exists(),
      ).toBe(true);
    });
  });
});

describe("EventRow - 回号 vol 表示", () => {
  it("vol があれば vol.NN を表示する", async () => {
    const wrapper = await mountWithRouter(EventRow, routes, "/", {
      props: { event: { ...baseEvent, vol: 74 } },
    });
    const v = wrapper.find('[data-testid="event-row-vol"]');
    expect(v.exists()).toBe(true);
    expect(v.text()).toBe("vol.74");
  });

  it("vol が null なら vol を表示しない", async () => {
    const wrapper = await mountWithRouter(EventRow, routes, "/", {
      props: { event: { ...baseEvent, vol: null } },
    });
    expect(wrapper.find('[data-testid="event-row-vol"]').exists()).toBe(false);
  });
});
