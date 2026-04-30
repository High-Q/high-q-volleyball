import { describe, expect, it } from "vitest";
import type { EventListRow } from "./event.types";
import {
  formatDateLabel,
  formatTimeRange,
  resolveDisplayStatus,
  translateVisibility,
} from "./event.helpers";

const baseRow = (overrides: Partial<EventListRow> = {}): EventListRow => ({
  id: "11111111-1111-4111-8111-111111111111" as EventListRow["id"],
  name: "ゆる練 vol.43",
  description: null,
  start_at: "2026-05-12T19:00:00+09:00",
  end_at: "2026-05-12T21:00:00+09:00",
  venue_id: "22222222-2222-4222-8222-222222222222" as EventListRow["venue_id"],
  venue_name: "亀戸スポーツセンター",
  fee: 1000,
  capacity: 24,
  visibility: "published",
  status: "scheduled",
  cancel_deadline: null,
  reserved_count: 0,
  created_at: "2026-04-01T00:00:00+09:00",
  updated_at: "2026-04-01T00:00:00+09:00",
  ...overrides,
});

const REF_NOW = new Date("2026-04-30T12:00:00+09:00");

describe("resolveDisplayStatus", () => {
  it("status='cancelled' は visibility に関わらず 'cancelled' を返す", () => {
    expect(
      resolveDisplayStatus(baseRow({ status: "cancelled", visibility: "published" }), REF_NOW),
    ).toBe("cancelled");
    expect(
      resolveDisplayStatus(baseRow({ status: "cancelled", visibility: "draft" }), REF_NOW),
    ).toBe("cancelled");
  });

  it("status='closed' は 'closed' を返す", () => {
    expect(
      resolveDisplayStatus(baseRow({ status: "closed", visibility: "published" }), REF_NOW),
    ).toBe("closed");
  });

  it("end_at が now より前なら 'closed' で上書き表示する（公開中であっても）", () => {
    const past = baseRow({
      end_at: "2026-04-01T20:00:00+09:00", // < REF_NOW
      visibility: "published",
      status: "scheduled",
    });
    expect(resolveDisplayStatus(past, REF_NOW)).toBe("closed");
  });

  it("end_at が now より後で、scheduled + published なら 'published'", () => {
    const upcoming = baseRow({
      end_at: "2026-05-12T21:00:00+09:00", // > REF_NOW
      visibility: "published",
      status: "scheduled",
    });
    expect(resolveDisplayStatus(upcoming, REF_NOW)).toBe("published");
  });

  it("end_at が now より後で draft なら 'draft'", () => {
    const draft = baseRow({
      end_at: "2026-05-12T21:00:00+09:00",
      visibility: "draft",
      status: "scheduled",
    });
    expect(resolveDisplayStatus(draft, REF_NOW)).toBe("draft");
  });

  it("end_at が now より後で private なら 'private'", () => {
    const priv = baseRow({
      end_at: "2026-05-12T21:00:00+09:00",
      visibility: "private",
      status: "scheduled",
    });
    expect(resolveDisplayStatus(priv, REF_NOW)).toBe("private");
  });
});

describe("translateVisibility", () => {
  it("'published' → '公開中'", () => {
    expect(translateVisibility("published")).toBe("公開中");
  });
  it("'draft' → '下書き'", () => {
    expect(translateVisibility("draft")).toBe("下書き");
  });
  it("'private' → '限定公開'", () => {
    expect(translateVisibility("private")).toBe("限定公開");
  });
});

describe("formatDateLabel", () => {
  it("ISO 文字列を 'YYYY/MM/DD (曜)' に整形する", () => {
    expect(formatDateLabel("2026-05-12T19:00:00+09:00")).toBe("2026/05/12 (火)");
  });

  it("月初・年初も 0 埋めで返る", () => {
    expect(formatDateLabel("2026-01-01T09:00:00+09:00")).toBe("2026/01/01 (木)");
  });
});

describe("formatTimeRange", () => {
  it("start_at / end_at の時刻部分を 'HH:mm-HH:mm' に整形する", () => {
    expect(
      formatTimeRange("2026-05-12T19:00:00+09:00", "2026-05-12T21:30:00+09:00"),
    ).toBe("19:00-21:30");
  });

  it("0 埋めで時刻が返る", () => {
    expect(
      formatTimeRange("2026-05-12T09:05:00+09:00", "2026-05-12T10:00:00+09:00"),
    ).toBe("09:05-10:00");
  });
});
