import { describe, expect, it } from "vitest";
import {
  deriveAnnouncementStatus,
  endDateToIso,
  isoToEndDate,
  isoToJstDate,
  isoToStartDate,
  startDateToIso,
} from "./announcementSchedule";

describe("startDateToIso / isoToStartDate", () => {
  it("掲載開始日を JST 00:00 の ISO にする", () => {
    expect(startDateToIso("2026-11-18")).toBe("2026-11-18T00:00:00+09:00");
  });

  it("往復で開始日が保たれる", () => {
    expect(isoToStartDate(startDateToIso("2026-11-18"))).toBe("2026-11-18");
  });
});

describe("endDateToIso / isoToEndDate", () => {
  it("掲載終了日は翌日 JST 00:00（排他的上限）にする", () => {
    expect(endDateToIso("2026-11-18")).toBe("2026-11-19T00:00:00+09:00");
  });

  it("月末跨ぎでも翌日になる", () => {
    expect(endDateToIso("2026-11-30")).toBe("2026-12-01T00:00:00+09:00");
  });

  it("空文字は null（無期限）", () => {
    expect(endDateToIso("")).toBeNull();
  });

  it("往復で終了日が保たれる", () => {
    expect(isoToEndDate(endDateToIso("2026-11-18"))).toBe("2026-11-18");
  });

  it("null は空文字に戻る", () => {
    expect(isoToEndDate(null)).toBe("");
  });
});

describe("isoToJstDate は端末 TZ に依存しない", () => {
  it("UTC 深夜の時刻でも JST 当日になる", () => {
    // 2026-11-18T16:00:00Z = 2026-11-19 01:00 JST
    expect(isoToJstDate("2026-11-18T16:00:00Z")).toBe("2026-11-19");
  });
});

describe("deriveAnnouncementStatus", () => {
  const start = "2026-11-10T00:00:00+09:00";
  const end = "2026-11-20T00:00:00+09:00";

  it("掲載開始前は scheduled", () => {
    expect(
      deriveAnnouncementStatus(
        { publishStart: start, publishEnd: end },
        new Date("2026-11-05T00:00:00+09:00"),
      ),
    ).toBe("scheduled");
  });

  it("掲載期間内は active", () => {
    expect(
      deriveAnnouncementStatus(
        { publishStart: start, publishEnd: end },
        new Date("2026-11-15T00:00:00+09:00"),
      ),
    ).toBe("active");
  });

  it("掲載終了時刻以降は ended", () => {
    expect(
      deriveAnnouncementStatus(
        { publishStart: start, publishEnd: end },
        new Date("2026-11-20T00:00:01+09:00"),
      ),
    ).toBe("ended");
  });

  it("終了未設定なら開始後は無期限 active", () => {
    expect(
      deriveAnnouncementStatus(
        { publishStart: start, publishEnd: null },
        new Date("2030-01-01T00:00:00+09:00"),
      ),
    ).toBe("active");
  });
});
