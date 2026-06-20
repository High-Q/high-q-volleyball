import { describe, expect, it } from "vitest";
import {
  unsafeEventId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import type { EventAvailability } from "@/entities/event";
import type { MyReservationItem } from "@/entities/reservation";
import { splitReservations } from "./splitReservations";

function makeItem(
  id: string,
  status: MyReservationItem["status"],
  startAt: string,
  availability: EventAvailability | null = null,
): MyReservationItem {
  void unsafeVenueId("00000000-0000-0000-0000-aaaaaaaaaaaa");
  return {
    id: unsafeReservationId(id),
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
      availability,
    },
  };
}

function full(): EventAvailability {
  return {
    eventId: unsafeEventId("00000000-0000-0000-0000-eeeeeeeeeeee"),
    capacity: 10,
    reservedCount: 10,
  };
}

describe("splitReservations", () => {
  const NOW = new Date("2026-05-07T09:00:00+09:00");

  it("未来 reserved は upcoming に振り分けられる", () => {
    const r = makeItem(
      "00000000-0000-0000-0000-000000000001",
      "reserved",
      "2026-05-15T19:00:00+09:00",
    );
    const result = splitReservations([r], NOW);
    expect(result.upcoming).toHaveLength(1);
    expect(result.cancelled).toHaveLength(0);
    expect(result.past).toHaveLength(0);
    expect(result.upcoming[0]?.id).toBe(r.id);
  });

  it("過去 reserved (不整合) は past に落ちる", () => {
    const r = makeItem(
      "00000000-0000-0000-0000-000000000002",
      "reserved",
      "2026-05-01T19:00:00+09:00",
    );
    const result = splitReservations([r], NOW);
    expect(result.upcoming).toHaveLength(0);
    expect(result.past).toHaveLength(1);
  });

  it("cancelled はすべて cancelled グループに集約され past には入らない", () => {
    const items: MyReservationItem[] = [
      makeItem(
        "00000000-0000-0000-0000-000000000a02",
        "cancelled",
        "2026-04-15T19:00:00+09:00",
      ),
      makeItem(
        "00000000-0000-0000-0000-000000000a05",
        "cancelled",
        "2026-06-01T19:00:00+09:00",
      ),
    ];
    const result = splitReservations(items, NOW);
    expect(result.cancelled).toHaveLength(2);
    expect(result.past).toHaveLength(0);
  });

  it("attended / no_show / waitlist は past に振り分けられる（cancelled は除外）", () => {
    const items: MyReservationItem[] = [
      makeItem(
        "00000000-0000-0000-0000-000000000a01",
        "attended",
        "2026-04-01T19:00:00+09:00",
      ),
      makeItem(
        "00000000-0000-0000-0000-000000000a03",
        "no_show",
        "2026-03-20T19:00:00+09:00",
      ),
      makeItem(
        "00000000-0000-0000-0000-000000000a04",
        "waitlist",
        "2026-06-01T19:00:00+09:00",
      ),
    ];
    const result = splitReservations(items, NOW);
    expect(result.cancelled).toHaveLength(0);
    expect(result.past).toHaveLength(3);
  });

  it("upcoming は start_at ASC（直近予定が先頭）", () => {
    const a = makeItem(
      "00000000-0000-0000-0000-000000000b01",
      "reserved",
      "2026-06-01T19:00:00+09:00",
    );
    const b = makeItem(
      "00000000-0000-0000-0000-000000000b02",
      "reserved",
      "2026-05-12T19:00:00+09:00",
    );
    const c = makeItem(
      "00000000-0000-0000-0000-000000000b03",
      "reserved",
      "2026-05-20T19:00:00+09:00",
    );
    const result = splitReservations([a, b, c], NOW);
    expect(result.upcoming.map((r) => r.event.startAt)).toEqual([
      "2026-05-12T19:00:00+09:00",
      "2026-05-20T19:00:00+09:00",
      "2026-06-01T19:00:00+09:00",
    ]);
  });

  it("past は start_at DESC（最新が先頭）", () => {
    const a = makeItem(
      "00000000-0000-0000-0000-000000000c01",
      "attended",
      "2026-03-01T19:00:00+09:00",
    );
    const b = makeItem(
      "00000000-0000-0000-0000-000000000c02",
      "attended",
      "2026-04-15T19:00:00+09:00",
    );
    const c = makeItem(
      "00000000-0000-0000-0000-000000000c03",
      "no_show",
      "2026-04-01T19:00:00+09:00",
    );
    const result = splitReservations([a, b, c], NOW);
    expect(result.past.map((r) => r.event.startAt)).toEqual([
      "2026-04-15T19:00:00+09:00",
      "2026-04-01T19:00:00+09:00",
      "2026-03-01T19:00:00+09:00",
    ]);
  });

  it("cancelled は「受付可能を先頭 ASC → 受付不可 DESC」で並ぶ", () => {
    // 受付可能（未来・非満席）: 6/25, 6/20 → ASC で 6/20, 6/25
    const rebook1 = makeItem(
      "00000000-0000-0000-0000-000000000d01",
      "cancelled",
      "2026-06-25T19:00:00+09:00",
    );
    const rebook2 = makeItem(
      "00000000-0000-0000-0000-000000000d02",
      "cancelled",
      "2026-06-20T19:00:00+09:00",
    );
    // 受付不可（開催済・NOW=5/07 より過去）: 4/10, 3/01 → DESC で 4/10, 3/01
    const past1 = makeItem(
      "00000000-0000-0000-0000-000000000d03",
      "cancelled",
      "2026-04-10T19:00:00+09:00",
    );
    const past2 = makeItem(
      "00000000-0000-0000-0000-000000000d04",
      "cancelled",
      "2026-03-01T19:00:00+09:00",
    );
    // 満席・未来 → 受付不可側に入り、DESC 群の最新として先頭に
    const fullFuture = makeItem(
      "00000000-0000-0000-0000-000000000d05",
      "cancelled",
      "2026-07-01T19:00:00+09:00",
      full(),
    );
    const result = splitReservations(
      [past2, fullFuture, rebook1, past1, rebook2],
      NOW,
    );
    expect(result.cancelled.map((r) => r.event.startAt)).toEqual([
      "2026-06-20T19:00:00+09:00",
      "2026-06-25T19:00:00+09:00",
      "2026-07-01T19:00:00+09:00",
      "2026-04-10T19:00:00+09:00",
      "2026-03-01T19:00:00+09:00",
    ]);
  });

  it("空配列 → 空 upcoming + 空 cancelled + 空 past", () => {
    const result = splitReservations([], NOW);
    expect(result.upcoming).toHaveLength(0);
    expect(result.cancelled).toHaveLength(0);
    expect(result.past).toHaveLength(0);
  });
});
