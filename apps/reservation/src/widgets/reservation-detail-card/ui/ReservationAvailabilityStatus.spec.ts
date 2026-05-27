import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { unsafeEventId } from "@high-q/shared";
import ReservationAvailabilityStatus from "./ReservationAvailabilityStatus.vue";
import type { EventAvailability } from "@/entities/event";

const EV_ID = unsafeEventId("11111111-1111-1111-1111-111111111111");

function make(
  capacity: number | null,
  reservedCount: number,
): EventAvailability {
  return { eventId: EV_ID, capacity, reservedCount };
}

describe("ReservationAvailabilityStatus", () => {
  it("capacity NULL → ラベル「予約状況」 + 「9 名 予約中」 + UNCAPPED · 定員上限なし", () => {
    const w = mount(ReservationAvailabilityStatus, {
      props: { availability: make(null, 9) },
    });
    expect(
      w.get('[data-testid="reservation-availability-label"]').text(),
    ).toBe("予約状況");
    expect(
      w.get('[data-testid="availability-strip"]').text(),
    ).toContain("9 名 予約中");
    expect(
      w.get('[data-testid="availability-strip-uncapped"]').text(),
    ).toBe("UNCAPPED · 定員上限なし");
  });

  it("capacity あり残あり → ラベル「あと何名」 + 「あと N 名 募集」 + light bar", () => {
    const w = mount(ReservationAvailabilityStatus, {
      props: { availability: make(18, 14) },
    });
    expect(
      w.get('[data-testid="reservation-availability-label"]').text(),
    ).toBe("あと何名");
    expect(
      w.get('[data-testid="availability-strip"]').text(),
    ).toContain("あと 4 名 募集");
    expect(
      w.find('[data-testid="availability-strip-bar"]').exists(),
    ).toBe(true);
  });

  it("満員 → ラベル「満員」 + 「満員」 + light bar (full)、「予約締切」表記なし", () => {
    const w = mount(ReservationAvailabilityStatus, {
      props: { availability: make(18, 18) },
    });
    expect(
      w.get('[data-testid="reservation-availability-label"]').text(),
    ).toBe("満員");
    const strip = w.get('[data-testid="availability-strip"]');
    expect(strip.text()).toContain("満員");
    expect(strip.text()).not.toContain("予約締切");
  });

  it("availability=null (取得失敗) → ラベル「予約状況」 + 「—」 fallback", () => {
    const w = mount(ReservationAvailabilityStatus, {
      props: { availability: null },
    });
    expect(
      w.get('[data-testid="reservation-availability-label"]').text(),
    ).toBe("予約状況");
    expect(
      w.get('[data-testid="availability-strip"]').text(),
    ).toContain("—");
    expect(w.find("button").exists()).toBe(false);
  });

  it("自分視点の補足文言 (「あなたを含む」等) は付与されない (どの状態でも)", () => {
    const samples = [
      make(null, 9),
      make(18, 14),
      make(18, 18),
      null,
    ];
    for (const a of samples) {
      const w = mount(ReservationAvailabilityStatus, {
        props: { availability: a },
      });
      expect(w.text()).not.toContain("あなた");
    }
  });
});
