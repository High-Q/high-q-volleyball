import { describe, expect, it } from "vitest";
import {
  unsafeEventId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import type { MyReservationItem } from "@/entities/reservation";
import { computeHistoryStats } from "./computeHistoryStats";

function makeItem(
  status: MyReservationItem["status"],
  startAt: string,
  id: string = "00000000-0000-0000-0000-000000000001",
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
    },
  };
}

describe("computeHistoryStats", () => {
  const NOW = new Date("2026-05-07T09:00:00+09:00");

  it("0 件で attendedCount=0 / daysToNext=null / streakMonths=0", () => {
    const result = computeHistoryStats([], NOW);
    expect(result).toEqual({
      attendedCount: 0,
      daysToNext: null,
      streakMonths: 0,
    });
  });

  it("TOTAL: attended のみカウントする (reserved/cancelled/no_show は数えない)", () => {
    const items = [
      makeItem("attended", "2026-04-01T19:00:00+09:00"),
      makeItem("attended", "2026-03-15T19:00:00+09:00"),
      makeItem("attended", "2026-02-20T19:00:00+09:00"),
      makeItem("reserved", "2026-06-01T19:00:00+09:00"),
      makeItem("cancelled", "2026-01-05T19:00:00+09:00"),
      makeItem("no_show", "2025-12-10T19:00:00+09:00"),
    ];
    expect(computeHistoryStats(items, NOW).attendedCount).toBe(3);
  });

  it("NEXT: 切り上げ日数 (同日 startAt → 0 / 翌日深夜 → 1 / 8 日後 → 8)", () => {
    const sameDay = makeItem("reserved", "2026-05-07T21:00:00+09:00");
    expect(computeHistoryStats([sameDay], NOW).daysToNext).toBe(0);

    const tomorrowMidnight = makeItem("reserved", "2026-05-08T00:30:00+09:00");
    expect(computeHistoryStats([tomorrowMidnight], NOW).daysToNext).toBe(1);

    const eightDaysLater = makeItem("reserved", "2026-05-15T19:00:00+09:00");
    expect(computeHistoryStats([eightDaysLater], NOW).daysToNext).toBe(8);
  });

  it("NEXT: 過去の reserved は無視 / 最早の未来 reserved を採用", () => {
    const past = makeItem("reserved", "2026-05-01T19:00:00+09:00");
    const farFuture = makeItem("reserved", "2026-07-01T19:00:00+09:00");
    const nearFuture = makeItem("reserved", "2026-05-12T19:00:00+09:00");
    const result = computeHistoryStats([past, farFuture, nearFuture], NOW);
    expect(result.daysToNext).toBe(5); // 5/7 → 5/12 = 5 日
  });

  it("STREAK: 連続 3 ヶ月 → 3", () => {
    const items = [
      makeItem("attended", "2026-05-03T19:00:00+09:00"),
      makeItem("attended", "2026-04-12T19:00:00+09:00"),
      makeItem("attended", "2026-03-22T19:00:00+09:00"),
    ];
    expect(computeHistoryStats(items, NOW).streakMonths).toBe(3);
  });

  it("STREAK: 1 ヶ月飛ばし → 直近のみ 1 (2 月飛ばすので 3 月以前は連続にカウントしない)", () => {
    const items = [
      makeItem("attended", "2026-05-03T19:00:00+09:00"),
      makeItem("attended", "2026-03-22T19:00:00+09:00"),
      makeItem("attended", "2026-01-10T19:00:00+09:00"),
    ];
    expect(computeHistoryStats(items, NOW).streakMonths).toBe(1);
  });

  it("STREAK: 直近 1 ヶ月内 attended なし → 0 (現在月にも前月にも参加していない)", () => {
    const items = [
      makeItem("attended", "2026-02-10T19:00:00+09:00"),
      makeItem("attended", "2026-01-10T19:00:00+09:00"),
    ];
    expect(computeHistoryStats(items, NOW).streakMonths).toBe(0);
  });

  it("STREAK: 同月内に複数 attended → 1 ヶ月としてカウント (重複しない)", () => {
    const items = [
      makeItem("attended", "2026-05-03T19:00:00+09:00", "00000000-0000-0000-0000-000000000001"),
      makeItem("attended", "2026-05-20T19:00:00+09:00", "00000000-0000-0000-0000-000000000002"),
    ];
    expect(computeHistoryStats(items, NOW).streakMonths).toBe(1);
  });

  it("STREAK: 前月までで途切れる場合 (現在月 attended なし、前月あり、前々月あり) → 2", () => {
    const items = [
      makeItem("attended", "2026-04-12T19:00:00+09:00"),
      makeItem("attended", "2026-03-22T19:00:00+09:00"),
    ];
    expect(computeHistoryStats(items, NOW).streakMonths).toBe(2);
  });
});
