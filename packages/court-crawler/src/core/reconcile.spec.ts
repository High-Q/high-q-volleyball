import { describe, it, expect } from "vitest";
import { reconcile, slotSignature } from "./reconcile.js";
import type { AvailabilitySlot } from "./types.js";

function slot(overrides: Partial<AvailabilitySlot> = {}): AvailabilitySlot {
  return {
    facility: "koto-sports",
    venueName: "スポーツ会館 大体育室 半面",
    slotDate: "2026-08-08",
    startAt: "2026-08-08T18:00:00+09:00",
    endAt: "2026-08-08T21:30:00+09:00",
    reserveUrl: "https://yoyaku.koto-sports.net/",
    ...overrides,
  };
}

describe("slotSignature", () => {
  it("同一枠は同じ署名・reserveUrl 違いは無視する", () => {
    expect(slotSignature(slot())).toBe(
      slotSignature(slot({ reserveUrl: "https://example.com/other" })),
    );
  });

  it("キー列（会場/日付/時刻）が違えば別署名", () => {
    expect(slotSignature(slot())).not.toBe(
      slotSignature(slot({ venueName: "深川スポーツセンター 大体育室 半面" })),
    );
    expect(slotSignature(slot())).not.toBe(
      slotSignature(slot({ startAt: "2026-08-08T09:00:00+09:00" })),
    );
  });
});

describe("reconcile", () => {
  it("新規に空いた枠を toNotify に出す（A − B）", () => {
    const a = slot({ startAt: "2026-08-08T09:00:00+09:00" });
    const b = slot({ startAt: "2026-08-08T13:00:00+09:00" });
    const { toNotify, toRelease } = reconcile([a, b], [b]);
    expect(toNotify).toEqual([a]);
    expect(toRelease).toEqual([]);
  });

  it("埋まって消えた枠を toRelease に出す（B − A）", () => {
    const stillOpen = slot({ startAt: "2026-08-08T09:00:00+09:00" });
    const filled = slot({ startAt: "2026-08-08T13:00:00+09:00" });
    const { toNotify, toRelease } = reconcile([stillOpen], [stillOpen, filled]);
    expect(toNotify).toEqual([]);
    expect(toRelease).toEqual([filled]);
  });

  it("通知済みで依然空きの枠は再通知しない", () => {
    const s = slot();
    const { toNotify } = reconcile([s], [s]);
    expect(toNotify).toEqual([]);
  });

  it("current 内の重複署名は 1 件に畳む", () => {
    const s = slot();
    const { toNotify } = reconcile([s, { ...s }], []);
    expect(toNotify).toHaveLength(1);
  });

  it("空き0件なら全通知済みが release される", () => {
    const s = slot();
    const { toNotify, toRelease } = reconcile([], [s]);
    expect(toNotify).toEqual([]);
    expect(toRelease).toEqual([s]);
  });
});
