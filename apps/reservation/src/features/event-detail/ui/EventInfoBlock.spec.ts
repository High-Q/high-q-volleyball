import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { unsafeEventId, unsafeVenueId } from "@high-q/shared";
import EventInfoBlock from "./EventInfoBlock.vue";
import type { EventAvailability, EventDetail } from "@/entities/event";

const EV_ID = unsafeEventId("11111111-1111-1111-1111-111111111111");
const V_ID = unsafeVenueId("22222222-2222-2222-2222-222222222222");

function makeAvailability(
  capacity: number | null,
  reservedCount: number,
): EventAvailability {
  return { eventId: EV_ID, capacity, reservedCount };
}

function makeEvent(
  availability: EventAvailability | null = makeAvailability(null, 11),
): EventDetail {
  return {
    id: EV_ID,
    name: "ゆる練 vol.43",
    startAt: "2026-05-12T10:30:00Z",
    endAt: "2026-05-12T12:30:00Z",
    venueId: V_ID,
    venueName: "亀戸スポーツセンター",
    fee: 1000,
    meetingPoint: "1F ロビー",
    mapUrl: null,
    vol: 43,
    availability,
  };
}

describe("EventInfoBlock", () => {
  it("Date / Time / Venue / Meeting / Fee / Availability の 5 行を描画", () => {
    const w = mount(EventInfoBlock, { props: { event: makeEvent() } });
    expect(w.find('[data-testid="event-info-datetime"]').exists()).toBe(true);
    expect(w.find('[data-testid="event-info-venue-name"]').exists()).toBe(true);
    expect(w.find('[data-testid="event-info-meeting-point"]').exists()).toBe(
      true,
    );
    expect(w.find('[data-testid="event-info-fee"]').exists()).toBe(true);
    expect(w.find('[data-testid="event-info-availability"]').exists()).toBe(
      true,
    );
  });

  it("capacity NULL × 予約 11 → 「11 名 予約中」", () => {
    const w = mount(EventInfoBlock, {
      props: { event: makeEvent(makeAvailability(null, 11)) },
    });
    expect(
      w.get('[data-testid="event-info-availability"]').text(),
    ).toContain("11 名 予約中");
  });

  it("capacity あり残あり → 「あと N 名 募集」", () => {
    const w = mount(EventInfoBlock, {
      props: { event: makeEvent(makeAvailability(18, 11)) },
    });
    expect(
      w.get('[data-testid="event-info-availability"]').text(),
    ).toContain("あと 7 名 募集");
  });

  it("満員 → 「満員」 (text-danger トーン)", () => {
    const w = mount(EventInfoBlock, {
      props: { event: makeEvent(makeAvailability(18, 18)) },
    });
    const row = w.get('[data-testid="event-info-availability"]');
    expect(row.text()).toContain("満員");
    expect(row.get("dd").classes()).toContain("text-danger");
  });

  it("availability=null (取得失敗) → 「—」 fallback、他の行は通常描画", () => {
    const w = mount(EventInfoBlock, { props: { event: makeEvent(null) } });
    expect(
      w.get('[data-testid="event-info-availability"]').text(),
    ).toContain("—");
    expect(w.get('[data-testid="event-info-fee"]').text()).toContain("1,000 円");
    expect(
      w.get('[data-testid="event-info-meeting-point"]').text(),
    ).toContain("1F ロビー");
  });

  it("「席」表記は使われない", () => {
    const samples = [
      makeAvailability(null, 11),
      makeAvailability(18, 11),
      makeAvailability(18, 18),
    ];
    for (const a of samples) {
      const w = mount(EventInfoBlock, { props: { event: makeEvent(a) } });
      expect(
        w.get('[data-testid="event-info-availability"]').text(),
      ).not.toMatch(/席/);
    }
  });
});
