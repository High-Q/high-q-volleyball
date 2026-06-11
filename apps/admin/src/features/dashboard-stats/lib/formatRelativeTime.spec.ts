import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

const NOW = new Date("2026-06-12T12:00:00Z");
const iso = (d: Date) => d.toISOString();

function offset(ms: number): string {
  return iso(new Date(NOW.getTime() - ms));
}

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("< 1 分 は たった今", () => {
    expect(formatRelativeTime(offset(30 * 1000), NOW)).toBe("たった今");
  });

  it("17 分前", () => {
    expect(formatRelativeTime(offset(17 * MIN), NOW)).toBe("17 分前");
  });

  it("59 分前 は 分前 のまま", () => {
    expect(formatRelativeTime(offset(59 * MIN), NOW)).toBe("59 分前");
  });

  it("60 分丁度 は 1 時間前", () => {
    expect(formatRelativeTime(offset(60 * MIN), NOW)).toBe("1 時間前");
  });

  it("3 時間前", () => {
    expect(formatRelativeTime(offset(3 * HOUR), NOW)).toBe("3 時間前");
  });

  it("23 時間前 は 時間前 のまま", () => {
    expect(formatRelativeTime(offset(23 * HOUR), NOW)).toBe("23 時間前");
  });

  it("24 時間丁度 は 昨日", () => {
    expect(formatRelativeTime(offset(24 * HOUR), NOW)).toBe("昨日");
  });

  it("3 日前", () => {
    expect(formatRelativeTime(offset(3 * DAY), NOW)).toBe("3 日前");
  });

  it("6 日前", () => {
    expect(formatRelativeTime(offset(6 * DAY), NOW)).toBe("6 日前");
  });

  it("7 日以上は yyyy/MM/dd 絶対表記", () => {
    const v = formatRelativeTime(offset(8 * DAY), NOW);
    expect(v).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
  });
});
