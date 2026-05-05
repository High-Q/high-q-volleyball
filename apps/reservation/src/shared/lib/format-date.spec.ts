import { describe, expect, it } from "vitest";
import { formatFee, formatJaDate, formatTimeRange } from "./format-date";

describe("formatJaDate", () => {
  it("ISO 8601 を YYYY年M月D日 (曜) JST 形式で返す", () => {
    expect(formatJaDate("2026-05-08T10:00:00Z")).toBe("2026年5月8日 (金)");
  });

  it("月跨ぎ深夜の ISO 値が JST で正しい日に変換される", () => {
    // UTC 2026-05-31T20:00:00Z → JST 2026-06-01T05:00:00+09:00
    expect(formatJaDate("2026-05-31T20:00:00Z")).toBe("2026年6月1日 (月)");
  });
});

describe("formatTimeRange", () => {
  it("開始-終了の HH:mm を JST で連結する", () => {
    expect(
      formatTimeRange("2026-05-08T10:00:00Z", "2026-05-08T12:30:00Z"),
    ).toBe("19:00-21:30");
  });
});

describe("formatFee", () => {
  it("1000 → 1,000 円", () => {
    expect(formatFee(1000)).toBe("1,000 円");
  });

  it("NULL → 未定", () => {
    expect(formatFee(null)).toBe("未定");
  });

  it("0 → 0 円", () => {
    expect(formatFee(0)).toBe("0 円");
  });
});
