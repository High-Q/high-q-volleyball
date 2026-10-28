import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANNOUNCEMENT_PLACEHOLDERS,
  findUnknownPlaceholders,
  renderAnnouncement,
  type AnnouncementEventInput,
} from "./renderAnnouncement";

/**
 * spec: openspec/changes/line-announcement-copy/specs/admin-line-announcement/spec.md
 *   「差し込み項目の展開規則」
 */

const LINK = "https://example.com/events/abc?book=1&openExternalBrowser=1";

const FULL: AnnouncementEventInput = {
  name: "ゆる練",
  vol: 42,
  // 2026-11-14 (土) 18:00-20:00 JST
  startAt: "2026-11-14T09:00:00Z",
  endAt: "2026-11-14T11:00:00Z",
  venueName: "有明会場",
  fee: 1000,
  capacity: 24,
  bookingLink: LINK,
};

const ALL =
  "{イベント名}|{回号}|{日付}|{開始時刻}|{終了時刻}|{会場}|{参加費}|{定員}|{予約リンク}";

describe("renderAnnouncement", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("全差し込み項目を展開する", () => {
    expect(renderAnnouncement(ALL, FULL)).toBe(
      `ゆる練|vol.42|11/14(土)|18:00|20:00|有明会場|1,000円|24名|${LINK}`,
    );
  });

  it("値が無い項目: 回号・会場・定員は空文字、参加費は「未定」", () => {
    expect(
      renderAnnouncement("{回号}|{会場}|{定員}|{参加費}", {
        ...FULL,
        vol: null,
        venueName: null,
        capacity: null,
        fee: null,
      }),
    ).toBe("|||未定");
  });

  it("参加費 0 は「無料」", () => {
    expect(renderAnnouncement("{参加費}", { ...FULL, fee: 0 })).toBe("無料");
  });

  it("知らない差し込み項目はそのまま残す", () => {
    expect(renderAnnouncement("{集合時刻} / {会場}", FULL)).toBe(
      "{集合時刻} / 有明会場",
    );
  });

  it("同じ差し込み項目が複数回あってもすべて置き換える", () => {
    expect(renderAnnouncement("{イベント名}と{イベント名}", FULL)).toBe(
      "ゆる練とゆる練",
    );
  });

  it("日付をまたぐ JST 時刻でも日本時間で整形する (UTC 15:30 = JST 翌日 0:30)", () => {
    expect(
      renderAnnouncement("{日付} {開始時刻}", {
        ...FULL,
        startAt: "2026-11-13T15:30:00Z",
      }),
    ).toBe("11/14(土) 00:30");
  });

  it("端末タイムゾーンが UTC でも日本時間で整形する", () => {
    vi.stubEnv("TZ", "UTC");
    expect(renderAnnouncement("{日付} {開始時刻}-{終了時刻}", FULL)).toBe(
      "11/14(土) 18:00-20:00",
    );
  });
});

describe("findUnknownPlaceholders", () => {
  it("既知の差し込み項目のみなら空配列", () => {
    expect(findUnknownPlaceholders(ALL)).toEqual([]);
  });

  it("知らない差し込み項目を重複なしで返す", () => {
    expect(
      findUnknownPlaceholders("{集合時刻} {会場} {集合時刻} {持ち物}"),
    ).toEqual(["{集合時刻}", "{持ち物}"]);
  });

  it("改行を含む波括弧は差し込み項目とみなさない", () => {
    expect(findUnknownPlaceholders("{\n}")).toEqual([]);
  });
});

describe("ANNOUNCEMENT_PLACEHOLDERS", () => {
  it("9 項目を定義順で持つ", () => {
    expect(ANNOUNCEMENT_PLACEHOLDERS.map((p) => p.token)).toEqual([
      "{イベント名}",
      "{回号}",
      "{日付}",
      "{開始時刻}",
      "{終了時刻}",
      "{会場}",
      "{参加費}",
      "{定員}",
      "{予約リンク}",
    ]);
  });
});
