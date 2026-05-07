import { describe, expect, it, vi } from "vitest";
import { buildIcs, buildIcsFileName } from "./build-ics";

const FIXED_NOW = "2026-04-27T05:32:00Z";

describe("buildIcs", () => {
  beforeEachStub();

  const baseInput = {
    reservationId: "11111111-1111-1111-1111-111111111111",
    reservationNumber: "#HQ-2605-A8F2",
    eventName: "ゆる練 vol.43",
    startAt: "2026-05-15T10:30:00Z",
    endAt: "2026-05-15T12:30:00Z",
    venueName: "亀戸スポーツセンター",
    venueAddress: "東京都江東区亀戸2-35-7",
  };

  it("VCALENDAR / VEVENT の必須行を全て含む", () => {
    const ics = buildIcs(baseInput);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("PRODID:-//High Q//Reservation//JP");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:");
    expect(ics).toContain("DTSTAMP:");
    expect(ics).toContain("DTSTART:");
    expect(ics).toContain("DTEND:");
    expect(ics).toContain("SUMMARY:");
    expect(ics).toContain("LOCATION:");
    expect(ics).toContain("DESCRIPTION:");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("UID は reservation-{reservationId}@high-q.example 形式で予約 ID 単位で安定", () => {
    const a = buildIcs(baseInput);
    const b = buildIcs(baseInput);
    const uidLine = a.split("\r\n").find((l) => l.startsWith("UID:"));
    expect(uidLine).toBe(
      "UID:reservation-11111111-1111-1111-1111-111111111111@high-q.example",
    );
    // 同一入力なら UID 完全一致 (DTSTAMP は now() に依存するためそれ以外で比較)
    const stripStamp = (s: string) =>
      s.split("\r\n").filter((l) => !l.startsWith("DTSTAMP:")).join("\r\n");
    expect(stripStamp(a)).toBe(stripStamp(b));
  });

  it("DTSTART / DTEND は UTC + Z サフィックス形式", () => {
    const ics = buildIcs(baseInput);
    expect(ics).toContain("DTSTART:20260515T103000Z");
    expect(ics).toContain("DTEND:20260515T123000Z");
  });

  it("LOCATION は会場名 / 住所の連結", () => {
    const ics = buildIcs(baseInput);
    expect(ics).toContain("LOCATION:亀戸スポーツセンター / 東京都江東区亀戸2-35-7");
  });

  it("address が NULL のとき LOCATION は会場名のみ", () => {
    const ics = buildIcs({ ...baseInput, venueAddress: null });
    expect(ics).toContain("LOCATION:亀戸スポーツセンター");
    expect(ics).not.toContain("LOCATION:亀戸スポーツセンター / ");
  });

  it("SUMMARY / DESCRIPTION の特殊文字 (; , \\) はエスケープされる", () => {
    const ics = buildIcs({
      ...baseInput,
      eventName: "test; with, special\\chars",
    });
    expect(ics).toContain("SUMMARY:test\\; with\\, special\\\\chars");
  });

  it("DESCRIPTION には予約番号が含まれる", () => {
    const ics = buildIcs(baseInput);
    expect(ics).toContain("DESCRIPTION:予約番号 #HQ-2605-A8F2");
  });

  it("行は CRLF で区切られ、末尾も CRLF", () => {
    const ics = buildIcs(baseInput);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.includes("\r\n")).toBe(true);
  });
});

describe("buildIcsFileName", () => {
  it("先頭の # を除去し high-q-{...}.ics を返す", () => {
    expect(buildIcsFileName("#HQ-2605-A8F2")).toBe("high-q-HQ-2605-A8F2.ics");
  });

  it("# が無い予約番号もそのまま処理", () => {
    expect(buildIcsFileName("HQ-2605-A8F2")).toBe("high-q-HQ-2605-A8F2.ics");
  });
});

function beforeEachStub(): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(FIXED_NOW));
}
