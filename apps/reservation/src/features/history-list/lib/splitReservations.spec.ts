import { describe, expect, it } from "vitest";
import {
  unsafeEventId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import type { MyReservationItem } from "@/entities/reservation";
import { splitReservations } from "./splitReservations";

function makeItem(
  id: string,
  status: MyReservationItem["status"],
  startAt: string,
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
      availability: null,
    },
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

  it("attended / cancelled / no_show / waitlist はすべて past に振り分けられる", () => {
    const items: MyReservationItem[] = [
      makeItem(
        "00000000-0000-0000-0000-000000000a01",
        "attended",
        "2026-04-01T19:00:00+09:00",
      ),
      makeItem(
        "00000000-0000-0000-0000-000000000a02",
        "cancelled",
        "2026-04-15T19:00:00+09:00",
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
    expect(result.upcoming).toHaveLength(0);
    expect(result.past).toHaveLength(4);
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
      "cancelled",
      "2026-04-01T19:00:00+09:00",
    );
    const result = splitReservations([a, b, c], NOW);
    expect(result.past.map((r) => r.event.startAt)).toEqual([
      "2026-04-15T19:00:00+09:00",
      "2026-04-01T19:00:00+09:00",
      "2026-03-01T19:00:00+09:00",
    ]);
  });

  it("空配列 → 空 upcoming + 空 past", () => {
    const result = splitReservations([], NOW);
    expect(result.upcoming).toHaveLength(0);
    expect(result.past).toHaveLength(0);
  });
});
