import { describe, it, expect } from "vitest";
import { formatNotification, formatSlotLine } from "./format.js";
import type { AvailabilitySlot } from "./types.js";

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

describe("formatSlotLine", () => {
  it("会場名 / 日時（曜日つき・JST）/ 予約 URL を含む", () => {
    const line = formatSlotLine(slot());
    expect(line).toContain("スポーツ会館 大体育室 半面");
    expect(line).toContain("8月8日(土)");
    expect(line).toContain("18:00〜21:30");
    expect(line).toContain("https://yoyaku.koto-sports.net/");
  });
});

describe("formatNotification", () => {
  it("空配列なら空文字", () => {
    expect(formatNotification([])).toBe("");
  });

  it("複数枠を 1 メッセージに集約し件数を出す", () => {
    const msg = formatNotification([
      slot(),
      slot({
        venueName: "東砂スポーツセンター 大体育室 半面",
        startAt: "2026-08-09T09:00:00+09:00",
        endAt: "2026-08-09T12:00:00+09:00",
        slotDate: "2026-08-09",
      }),
    ]);
    expect(msg).toContain("2件");
    expect(msg).toContain("スポーツ会館 大体育室 半面");
    expect(msg).toContain("東砂スポーツセンター 大体育室 半面");
    expect(msg).toContain("8月9日(日)");
  });
});
