import { describe, expect, it } from "vitest";
import {
  unsafeEventId,
  unsafeReservationId,
} from "@high-q/shared";
import { mountWithRouter } from "@/test/mountWithRouter";
import HomeNextCard from "./HomeNextCard.vue";
import type { EventAvailability } from "@/entities/event";
import type { MyReservationItem } from "@/entities/reservation";

const EV_ID = unsafeEventId("11111111-1111-1111-1111-111111111111");

function makeAvailability(
  capacity: number | null,
  reservedCount: number,
): EventAvailability {
  return { eventId: EV_ID, capacity, reservedCount };
}

const stubReservation: MyReservationItem = {
  id: unsafeReservationId("a1b2c3d4-e5f6-7890-abcd-ef0123456789"),
  status: "reserved",
  guestCount: 0,
  cancelledAt: null,
  event: {
    id: EV_ID,
    name: "ゆる練 vol.43",
    startAt: "2026-05-12T10:30:00Z", // JST 月 19:30
    endAt: "2026-05-12T12:30:00Z", // JST 21:30
    fee: 1000,
    venueName: "亀戸スポーツセンター",
    availability: makeAvailability(null, 9),
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

  describe("予約埋まり具合 strip (Issue #305)", () => {
    function withAvailability(
      availability: EventAvailability | null,
    ): MyReservationItem {
      return {
        ...stubReservation,
        event: { ...stubReservation.event, availability },
      };
    }

    it("capacity NULL × 予約 9 名 → 「9 名 予約中」 + UNCAPPED", async () => {
      const wrapper = await mountWithRouter(HomeNextCard, routes, "/", {
        props: {
          reservation: withAvailability(makeAvailability(null, 9)),
          now: fixedNow,
        },
      });
      const strip = wrapper.get('[data-testid="next-availability-strip"]');
      expect(strip.get('[data-testid="availability-strip"]').text()).toContain(
        "9 名 予約中",
      );
      expect(
        strip.find('[data-testid="availability-strip-uncapped"]').exists(),
      ).toBe(true);
    });

    it("capacity あり残あり → 「あと N 名 募集」 + dark progress bar", async () => {
      const wrapper = await mountWithRouter(HomeNextCard, routes, "/", {
        props: {
          reservation: withAvailability(makeAvailability(18, 14)),
          now: fixedNow,
        },
      });
      const strip = wrapper.get('[data-testid="next-availability-strip"]');
      expect(strip.text()).toContain("あと 4 名 募集");
      expect(
        strip.find('[data-testid="availability-strip-bar"]').exists(),
      ).toBe(true);
    });

    it("満員 → 「満員」 + dark progress bar (full)", async () => {
      const wrapper = await mountWithRouter(HomeNextCard, routes, "/", {
        props: {
          reservation: withAvailability(makeAvailability(18, 18)),
          now: fixedNow,
        },
      });
      const strip = wrapper.get('[data-testid="next-availability-strip"]');
      expect(strip.text()).toContain("満員");
      expect(
        strip.find('[data-testid="availability-strip-bar"]').exists(),
      ).toBe(true);
    });

    it("availability=null (取得失敗) → 「—」 fallback、主データは継続描画", async () => {
      const wrapper = await mountWithRouter(HomeNextCard, routes, "/", {
        props: {
          reservation: withAvailability(null),
          now: fixedNow,
        },
      });
      expect(
        wrapper.get('[data-testid="next-availability-strip"]').text(),
      ).toContain("—");
      // 主データは通常描画されること
      expect(wrapper.get('[data-testid="event-name"]').text()).toBe(
        "ゆる練 vol.43",
      );
      expect(wrapper.get('[data-testid="reservation-number"]').text()).toMatch(
        /^予約 #HQ-/,
      );
    });

    it("自分視点の補足文言 (「あなたを含む」等) は描画されない", async () => {
      const wrapper = await mountWithRouter(HomeNextCard, routes, "/", {
        props: {
          reservation: withAvailability(makeAvailability(null, 9)),
          now: fixedNow,
        },
      });
      expect(wrapper.text()).not.toContain("あなた");
    });
  });
});
