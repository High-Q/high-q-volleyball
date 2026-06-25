import { describe, expect, it } from "vitest";
import {
  unsafeEventId,
  unsafeReservationId,
} from "@high-q/shared";
import type { MyReservationItem } from "@/entities/reservation";
import { computeStats } from "./computeStats";

const NOW = new Date("2026-05-07T12:00:00Z");

function fixture(
  partial: Partial<MyReservationItem> & {
    status: MyReservationItem["status"];
    startAt: string;
  },
  idx = 0,
): MyReservationItem {
  return {
    id: unsafeReservationId(`11111111-1111-1111-1111-${String(idx).padStart(12, "0")}`),
    status: partial.status,
    guestCount: 0,
    cancelledAt: null,
    event: {
      id: unsafeEventId(`22222222-2222-2222-2222-${String(idx).padStart(12, "0")}`),
      name: `event ${idx}`,
      startAt: partial.startAt,
      endAt: partial.startAt,
      fee: 1500,
      venueName: "venue",
      vol: null,
      availability: null,
    },
  };
}

describe("computeStats", () => {
  it("3 件 attended / 2 件 reserved 未来 / 1 件 cancelled の集計", () => {
    const reservations: MyReservationItem[] = [
      fixture({ status: "attended", startAt: "2026-04-14T19:00:00Z" }, 1),
      fixture({ status: "attended", startAt: "2026-03-10T19:00:00Z" }, 2),
      fixture({ status: "attended", startAt: "2026-02-01T19:00:00Z" }, 3),
      fixture({ status: "reserved", startAt: "2026-05-12T19:00:00Z" }, 4),
      fixture({ status: "reserved", startAt: "2026-06-01T19:00:00Z" }, 5),
      fixture({ status: "cancelled", startAt: "2026-04-20T19:00:00Z" }, 6),
    ];
    const result = computeStats(reservations, NOW);
    expect(result.attendedCount).toBe(3);
    expect(result.lastAttendedAt).toBe("2026-04-14T19:00:00Z");
    expect(result.nextUpcoming?.event.startAt).toBe("2026-05-12T19:00:00Z");
  });

  it("0 件のとき null を返す", () => {
    const result = computeStats([], NOW);
    expect(result.attendedCount).toBe(0);
    expect(result.lastAttendedAt).toBeNull();
    expect(result.nextUpcoming).toBeNull();
  });

  it("reserved だが過去のイベントは次回予定から除外される", () => {
    const reservations: MyReservationItem[] = [
      fixture({ status: "reserved", startAt: "2026-04-01T19:00:00Z" }, 1),
    ];
    const result = computeStats(reservations, NOW);
    expect(result.nextUpcoming).toBeNull();
  });

  it("attended のみ存在する場合は次回予定が null", () => {
    const reservations: MyReservationItem[] = [
      fixture({ status: "attended", startAt: "2026-03-01T19:00:00Z" }, 1),
    ];
    const result = computeStats(reservations, NOW);
    expect(result.attendedCount).toBe(1);
    expect(result.nextUpcoming).toBeNull();
  });
});
