import { describe, it, expect } from "vitest";
import { filterTargetSlots, isTargetDay } from "./filter.js";
import type { AvailabilitySlot } from "./types.js";

const noHoliday = () => false;

function slot(overrides: Partial<AvailabilitySlot> = {}): AvailabilitySlot {
  return {
    facility: "koto-sports",
    venueName: "スポーツ会館 大体育室 半面",
    slotDate: "2026-08-08", // 土曜
    startAt: "2026-08-08T18:00:00+09:00",
    endAt: "2026-08-08T21:30:00+09:00",
    reserveUrl: "https://yoyaku.koto-sports.net/",
    ...overrides,
  };
}

describe("isTargetDay", () => {
  it("土曜・日曜は対象", () => {
    expect(isTargetDay("2026-08-08", noHoliday)).toBe(true); // 土
    expect(isTargetDay("2026-08-09", noHoliday)).toBe(true); // 日
  });

  it("平日は対象外", () => {
    expect(isTargetDay("2026-08-10", noHoliday)).toBe(false); // 月
    expect(isTargetDay("2026-08-07", noHoliday)).toBe(false); // 金
  });

  it("平日でも祝日なら対象", () => {
    // 2026-08-11 は火曜。祝日判定を注入すれば対象になる。
    const isHoliday = (ymd: string) => ymd === "2026-08-11";
    expect(isTargetDay("2026-08-11", isHoliday)).toBe(true);
  });

  it("不正な日付は対象外", () => {
    expect(isTargetDay("not-a-date", noHoliday)).toBe(false);
  });
});

describe("filterTargetSlots", () => {
  const now = new Date("2026-08-07T12:00:00+09:00");
  const opts = { now, minLeadTimeMs: 60 * 60 * 1000, isHoliday: noHoliday };

  it("土日・十分先の枠は残す", () => {
    const s = slot();
    expect(filterTargetSlots([s], opts)).toEqual([s]);
  });

  it("平日枠は除外", () => {
    const weekday = slot({
      slotDate: "2026-08-10",
      startAt: "2026-08-10T18:00:00+09:00",
    });
    expect(filterTargetSlots([weekday], opts)).toEqual([]);
  });

  it("過去の枠は除外", () => {
    const past = slot({
      slotDate: "2026-08-01",
      startAt: "2026-08-01T18:00:00+09:00",
    });
    expect(filterTargetSlots([past], opts)).toEqual([]);
  });

  it("リードタイム未満（直近すぎる）枠は除外", () => {
    const soon = slot({
      slotDate: "2026-08-08",
      startAt: "2026-08-07T12:30:00+09:00", // now+30分 < 60分
    });
    expect(filterTargetSlots([soon], opts)).toEqual([]);
  });
});
