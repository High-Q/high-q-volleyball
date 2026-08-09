import { describe, it, expect } from "vitest";
import { isJapaneseHoliday } from "./holidays.js";

describe("isJapaneseHoliday", () => {
  it("祝日を true にする（元日 / こどもの日 / 山の日）", () => {
    expect(isJapaneseHoliday("2026-01-01")).toBe(true);
    expect(isJapaneseHoliday("2026-05-05")).toBe(true);
    expect(isJapaneseHoliday("2026-08-11")).toBe(true);
  });

  it("平日は false", () => {
    expect(isJapaneseHoliday("2026-08-12")).toBe(false);
  });

  it("不正な日付は false（例外を投げない）", () => {
    expect(isJapaneseHoliday("not-a-date")).toBe(false);
  });
});
