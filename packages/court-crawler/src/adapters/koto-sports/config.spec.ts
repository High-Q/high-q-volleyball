import { describe, it, expect } from "vitest";
import { isMonitoredVenue, KOTO_TARGET_FACILITIES } from "./config.js";

describe("isMonitoredVenue", () => {
  it("大体育室 半面だけを対象にする", () => {
    expect(isMonitoredVenue("スポーツ会館 大体育室 半面")).toBe(true);
    expect(isMonitoredVenue("東砂スポーツセンター 大体育室 半面")).toBe(true);
  });

  it("全面・小体育室は対象外", () => {
    expect(isMonitoredVenue("スポーツ会館 大体育室 全面")).toBe(false);
    expect(isMonitoredVenue("スポーツ会館 小体育室")).toBe(false);
  });

  it("対象 6 施設を保持する", () => {
    expect(KOTO_TARGET_FACILITIES).toHaveLength(6);
    expect(KOTO_TARGET_FACILITIES).toContain("深川北スポーツセンター");
  });
});
