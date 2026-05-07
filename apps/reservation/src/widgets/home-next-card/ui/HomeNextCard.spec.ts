import { describe, expect, it } from "vitest";
import {
  unsafeEventId,
  unsafeReservationId,
} from "@high-q/shared";
import { mountWithRouter } from "@/test/mountWithRouter";
import HomeNextCard from "./HomeNextCard.vue";
import type { MyReservationItem } from "@/entities/reservation";

const stubReservation: MyReservationItem = {
  id: unsafeReservationId("a1b2c3d4-e5f6-7890-abcd-ef0123456789"),
  status: "reserved",
  guestCount: 0,
  cancelledAt: null,
  event: {
    id: unsafeEventId("11111111-1111-1111-1111-111111111111"),
    name: "ゆる練 vol.43",
    startAt: "2026-05-12T10:30:00Z", // JST 月 19:30
    endAt: "2026-05-12T12:30:00Z", // JST 21:30
    fee: 1000,
    venueName: "亀戸スポーツセンター",
  },
};

const routes = [
  { path: "/", component: { template: "<div />" } },
  {
    path: "/reservations/:reservationId",
    name: "reservation-detail",
    component: { template: "<div>detail</div>" },
  },
];

const fixedNow = new Date("2026-05-04T05:00:00Z"); // JST 14:00, 8 days before

describe("HomeNextCard", () => {
  it("カウントダウン・月日・曜日・時刻・イベント名・会場名・予約番号を描画する", async () => {
    const wrapper = await mountWithRouter(HomeNextCard, routes, "/", {
      props: { reservation: stubReservation, now: fixedNow },
    });

    expect(wrapper.get('[data-testid="countdown-label"]').text()).toBe(
      "— あと 8 日",
    );
    expect(wrapper.get('[data-testid="month-day"]').text()).toBe("05 / 12");
    expect(wrapper.get('[data-testid="weekday-time"]').text()).toContain("TUE");
    expect(wrapper.get('[data-testid="weekday-time"]').text()).toContain(
      "19:30 – 21:30",
    );
    expect(wrapper.get('[data-testid="event-name"]').text()).toBe("ゆる練 vol.43");
    expect(wrapper.get('[data-testid="venue-name"]').text()).toBe(
      "亀戸スポーツセンター",
    );
    expect(wrapper.get('[data-testid="reservation-number"]').text()).toMatch(
      /^予約 #HQ-/,
    );
    expect(wrapper.get('[data-testid="next-badge"]').text()).toBe("NEXT");
    expect(wrapper.get('[data-testid="detail-cta"]').text()).toContain(
      "詳細を見る",
    );
  });

  it("カード全体が予約詳細画面 (/reservations/:reservationId) への router-link を持つ", async () => {
    const wrapper = await mountWithRouter(HomeNextCard, routes, "/", {
      props: { reservation: stubReservation, now: fixedNow },
    });
    const link = wrapper.findComponent({ name: "RouterLink" });
    expect(link.exists()).toBe(true);
    expect(link.props("to")).toEqual({
      name: "reservation-detail",
      params: { reservationId: stubReservation.id },
    });
  });
});
