import { describe, expect, it } from "vitest";
import { formatCountdownLabel } from "./format-countdown";

describe("formatCountdownLabel", () => {
  it("開催 8 日前 (JST 日付差) は「— あと 8 日」", () => {
    // now = 2026-05-07 09:00 JST = 2026-05-07 00:00 UTC
    const now = new Date("2026-05-07T00:00:00Z");
    // start = 2026-05-15 19:30 JST
    const startAt = "2026-05-15T10:30:00Z";
    expect(formatCountdownLabel(startAt, now)).toBe("— あと 8 日");
  });

  it("JST 同日 (午前) で start が未来なら「— 当日」", () => {
    // now = 2026-05-07 09:00 JST
    const now = new Date("2026-05-07T00:00:00Z");
    // start = 2026-05-07 21:00 JST
    const startAt = "2026-05-07T12:00:00Z";
    expect(formatCountdownLabel(startAt, now)).toBe("— 当日");
  });

  it("start <= now は「— 開催終了」", () => {
    const now = new Date("2026-05-15T15:00:00Z");
    const startAt = "2026-05-15T10:30:00Z";
    expect(formatCountdownLabel(startAt, now)).toBe("— 開催終了");
  });

  it("翌日 0 時 JST を超えると 1 日後 (JST 跨ぎの境界)", () => {
    // now = 2026-05-07 23:30 JST = 2026-05-07 14:30 UTC
    const now = new Date("2026-05-07T14:30:00Z");
    // start = 2026-05-08 09:00 JST = 2026-05-08 00:00 UTC
    const startAt = "2026-05-08T00:00:00Z";
    expect(formatCountdownLabel(startAt, now)).toBe("— あと 1 日");
  });

  it("無効な ISO は「—」を返す", () => {
    expect(formatCountdownLabel("not-a-date", new Date())).toBe("—");
  });
});
