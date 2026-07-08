import { describe, expect, it } from "vitest";
import {
  unsafeEventId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import type { EventAvailability } from "@/entities/event";
import type { MyReservationItem } from "@/entities/reservation";
import { isRebookable } from "./isRebookable";

function makeItem(
  status: MyReservationItem["status"],
  startAt: string,
  availability: EventAvailability | null = null,
): MyReservationItem {
  void unsafeVenueId("00000000-0000-0000-0000-aaaaaaaaaaaa");
  return {
    id: unsafeReservationId("00000000-0000-0000-0000-000000000001"),
    status,
    guestCount: 0,
    cancelledAt: null,
    event: {
      id: unsafeEventId("00000000-0000-0000-0000-eeeeeeeeeeee"),
      name: "テスト練",
      startAt,
      endAt: startAt,
      fee: null,
      venueName: "テスト会場",
      vol: null,
      availability,
    },
  };
}

const NOW = new Date("2026-05-07T09:00:00+09:00");
const FUTURE = "2026-05-20T19:00:00+09:00";
const PAST = "2026-05-01T19:00:00+09:00";

function availability(
  capacity: number | null,
  reservedCount: number,
): EventAvailability {
  return {
    eventId: unsafeEventId("00000000-0000-0000-0000-eeeeeeeeeeee"),
    capacity,
    reservedCount,
  };
}

describe("isRebookable", () => {
  it("cancelled × 未開催 × 非満席 → true", () => {
    expect(isRebookable(makeItem("cancelled", FUTURE), NOW)).toBe(true);
  });

  it("cancelled × 未開催 × capacity NULL（無制限）→ true", () => {
    const item = makeItem("cancelled", FUTURE, availability(null, 99));
    expect(isRebookable(item, NOW)).toBe(true);
  });

  it("cancelled × 未開催 × 空きあり → true", () => {
    const item = makeItem("cancelled", FUTURE, availability(10, 5));
    expect(isRebookable(item, NOW)).toBe(true);
  });

  it("cancelled × 開催済 → false（受付終了）", () => {
    expect(isRebookable(makeItem("cancelled", PAST), NOW)).toBe(false);
  });

  it("cancelled × 未開催 × 満席 → false", () => {
    const item = makeItem("cancelled", FUTURE, availability(10, 10));
    expect(isRebookable(item, NOW)).toBe(false);
  });

  it("非 cancelled（reserved / attended / no_show / waitlist）→ false", () => {
    for (const status of [
      "reserved",
      "attended",
      "no_show",
      "waitlist",
    ] as const) {
      expect(isRebookable(makeItem(status, FUTURE), NOW)).toBe(false);
    }
  });

  it("startAt が不正な日付 → false", () => {
    expect(isRebookable(makeItem("cancelled", "invalid-date"), NOW)).toBe(
      false,
    );
  });
});
