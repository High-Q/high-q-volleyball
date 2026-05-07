import { describe, expect, it } from "vitest";
import { formatCountdown, formatCountdownLabel } from "./format-countdown";

describe("formatCountdownLabel (legacy)", () => {
  it("開催 8 日前 (JST 日付差) は「— あと 8 日」", () => {
    const now = new Date("2026-05-07T00:00:00Z");
    const startAt = "2026-05-15T10:30:00Z";
    expect(formatCountdownLabel(startAt, now)).toBe("— あと 8 日");
  });

  it("JST 同日 (午前) で start が未来なら「— 当日」", () => {
    const now = new Date("2026-05-07T00:00:00Z");
    const startAt = "2026-05-07T12:00:00Z";
    expect(formatCountdownLabel(startAt, now)).toBe("— 当日");
  });

  it("start <= now は「— 開催終了」", () => {
    const now = new Date("2026-05-15T15:00:00Z");
    const startAt = "2026-05-15T10:30:00Z";
    expect(formatCountdownLabel(startAt, now)).toBe("— 開催終了");
  });

  it("翌日 0 時 JST を超えると 1 日後 (JST 跨ぎの境界)", () => {
    const now = new Date("2026-05-07T14:30:00Z");
    const startAt = "2026-05-08T00:00:00Z";
    expect(formatCountdownLabel(startAt, now)).toBe("— あと 1 日");
  });

  it("無効な ISO は「—」を返す", () => {
    expect(formatCountdownLabel("not-a-date", new Date())).toBe("—");
  });
});

describe("formatCountdown - tone (#215)", () => {
  it("当日は imminent", () => {
    const now = new Date("2026-05-07T00:00:00Z");
    const startAt = "2026-05-07T12:00:00Z";
    expect(formatCountdown(startAt, now)).toEqual({
      label: "— 当日",
      tone: "imminent",
    });
  });

  it("7 日以内 (1〜7 日後) は imminent", () => {
    const now = new Date("2026-05-07T00:00:00Z");
    // 1 日後
    expect(
      formatCountdown("2026-05-08T10:30:00Z", now).tone,
    ).toBe("imminent");
    // 7 日後 = 5/14 19:30 JST
    expect(
      formatCountdown("2026-05-14T10:30:00Z", now).tone,
    ).toBe("imminent");
  });

  it("8 日以上先は normal", () => {
    const now = new Date("2026-05-07T00:00:00Z");
    // 8 日後 = 5/15 19:30 JST
    expect(
      formatCountdown("2026-05-15T10:30:00Z", now),
    ).toEqual({ label: "— あと 8 日", tone: "normal" });
    // 62 日後
    expect(
      formatCountdown("2026-07-08T10:30:00Z", now).tone,
    ).toBe("normal");
  });

  it("開催終了は ended", () => {
    const now = new Date("2026-05-15T15:00:00Z");
    expect(
      formatCountdown("2026-05-15T10:30:00Z", now),
    ).toEqual({ label: "— 開催終了", tone: "ended" });
  });

  it("無効な ISO は ended", () => {
    expect(formatCountdown("not-a-date", new Date())).toEqual({
      label: "—",
      tone: "ended",
    });
  });
});
