import { describe, it, expect, vi } from "vitest";
import { runCrawl, type CrawlDeps } from "./crawl.js";
import { slotSignature } from "../core/reconcile.js";
import type { AvailabilitySlot } from "../core/types.js";
import type { NotifiedStore } from "../store/notified-store.js";
import type { LinePushResult } from "../notify/line.js";

function slot(overrides: Partial<AvailabilitySlot> = {}): AvailabilitySlot {
  return {
    facility: "koto-sports",
    venueName: "スポーツ会館 大体育室 半面",
    slotDate: "2026-08-08", // 土
    startAt: "2026-08-08T18:00:00+09:00",
    endAt: "2026-08-08T21:30:00+09:00",
    reserveUrl: "https://yoyaku.koto-sports.net/",
    ...overrides,
  };
}

/** in-memory な NotifiedStore。 */
function fakeStore(initial: AvailabilitySlot[] = []): NotifiedStore & {
  rows: AvailabilitySlot[];
} {
  const rows = [...initial];
  return {
    rows,
    async fetchNotified(facility) {
      return rows.filter((r) => r.facility === facility);
    },
    async addNotified(slots) {
      for (const s of slots) {
        if (!rows.some((r) => slotSignature(r) === slotSignature(s))) rows.push(s);
      }
    },
    async removeReleased(slots) {
      const sigs = new Set(slots.map(slotSignature));
      for (let i = rows.length - 1; i >= 0; i--) {
        if (sigs.has(slotSignature(rows[i]!))) rows.splice(i, 1);
      }
    },
  };
}

function baseDeps(over: Partial<CrawlDeps> = {}): CrawlDeps {
  return {
    facility: "koto-sports",
    collect: async () => ({ slots: [slot()], gridDays: 3 }),
    store: fakeStore(),
    notify: async (): Promise<LinePushResult> => ({ ok: true, status: 200 }),
    reporter: { capture: vi.fn() },
    now: new Date("2026-08-01T00:00:00+09:00"),
    minLeadTimeMs: 60 * 60 * 1000,
    isHoliday: () => false,
    ...over,
  };
}

describe("runCrawl", () => {
  it("新規空き枠を通知しストアに記録する", async () => {
    const notify = vi.fn(async (_text: string): Promise<LinePushResult> => ({
      ok: true,
      status: 200,
    }));
    const store = fakeStore();
    const res = await runCrawl(baseDeps({ notify, store }));

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0]![0]).toContain("スポーツ会館 大体育室 半面");
    expect(res.notified).toBe(1);
    expect(store.rows).toHaveLength(1);
  });

  it("通知済みで依然空きの枠は再通知しない", async () => {
    const notify = vi.fn(async (): Promise<LinePushResult> => ({
      ok: true,
      status: 200,
    }));
    const store = fakeStore([slot()]);
    const res = await runCrawl(baseDeps({ notify, store }));

    expect(notify).not.toHaveBeenCalled();
    expect(res.notified).toBe(0);
  });

  it("埋まって消えた枠を記録解除する（再オープンで再通知できる状態に戻す）", async () => {
    const store = fakeStore([slot()]);
    const res = await runCrawl(
      baseDeps({ store, collect: async () => ({ slots: [], gridDays: 3 }) }),
    );
    expect(res.released).toBe(1);
    expect(store.rows).toHaveLength(0);
  });

  it("push 失敗時はストアに記録せず http_error を報告する（次回再送）", async () => {
    const reporter = { capture: vi.fn() };
    const store = fakeStore();
    const res = await runCrawl(
      baseDeps({
        reporter,
        store,
        notify: async () => ({ ok: false, status: 500, error: "boom" }),
      }),
    );
    expect(res.notified).toBe(0);
    expect(store.rows).toHaveLength(0);
    expect(reporter.capture).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "http_error" }),
    );
  });

  it("グリッドを読めない（gridDays=0）と parse_empty を報告する", async () => {
    const reporter = { capture: vi.fn() };
    const notify = vi.fn();
    await runCrawl(
      baseDeps({
        reporter,
        notify,
        collect: async () => ({ slots: [], gridDays: 0 }),
      }),
    );
    expect(reporter.capture).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "parse_empty" }),
    );
    expect(notify).not.toHaveBeenCalled();
  });

  it("collect が例外なら unreachable を報告する", async () => {
    const reporter = { capture: vi.fn() };
    await runCrawl(
      baseDeps({
        reporter,
        collect: async () => {
          throw new Error("timeout");
        },
      }),
    );
    expect(reporter.capture).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "unreachable", message: "timeout" }),
    );
  });

  it("監視室場フィルタ・平日除外で対象外は通知しない", async () => {
    const notify = vi.fn();
    const res = await runCrawl(
      baseDeps({
        notify,
        venueFilter: (v) => v.includes("半面"),
        collect: async () => ({
          slots: [
            slot({ venueName: "スポーツ会館 大体育室 全面" }), // 全面 → 除外
            slot({ slotDate: "2026-08-13", startAt: "2026-08-13T18:00:00+09:00" }), // 木 → 除外
          ],
          gridDays: 3,
        }),
      }),
    );
    expect(notify).not.toHaveBeenCalled();
    expect(res.notified).toBe(0);
  });
});
