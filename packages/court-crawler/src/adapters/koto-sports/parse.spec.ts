import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  parseAvailability,
  parseSelectDate,
  parseReiwaDate,
  hasAvailabilityGrid,
} from "./parse.js";
import type { AvailabilitySlot } from "../../core/types.js";

function fixture(name: string): string {
  return readFileSync(
    fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url)),
    "utf-8",
  );
}

const OPTS = {
  slotDate: "2026-08-08",
  reserveUrl: "https://yoyaku.koto-sports.net/",
};

describe("parseAvailability", () => {
  it("class=ok のセルだけを空き枠として抽出する", () => {
    const slots = parseAvailability(fixture("result-mixed.html"), OPTS);
    // ok セルは 4 つ（会館 全面@13-17 / 会館 半面@09-12 / 会館 半面@18-21:30 / 東砂 半面@18-21:30）
    expect(slots).toHaveLength(4);
  });

  it("会場名を「施設名 室場名」に正規化する（全角スペース→半角）", () => {
    const slots = parseAvailability(fixture("result-mixed.html"), OPTS);
    const names = new Set(slots.map((s) => s.venueName));
    expect(names).toContain("スポーツ会館 大体育室 全面");
    expect(names).toContain("スポーツ会館 大体育室 半面");
    expect(names).toContain("東砂スポーツセンター 大体育室 半面");
  });

  it("列の時間帯を開始・終了の ISO8601(JST) に対応づける", () => {
    const slots = parseAvailability(fixture("result-mixed.html"), OPTS);
    const hanmen = slots
      .filter((s) => s.venueName === "スポーツ会館 大体育室 半面")
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    expect(hanmen).toEqual<AvailabilitySlot[]>([
      {
        facility: "koto-sports",
        venueName: "スポーツ会館 大体育室 半面",
        slotDate: "2026-08-08",
        startAt: "2026-08-08T09:00:00+09:00",
        endAt: "2026-08-08T12:00:00+09:00",
        reserveUrl: "https://yoyaku.koto-sports.net/",
      },
      {
        facility: "koto-sports",
        venueName: "スポーツ会館 大体育室 半面",
        slotDate: "2026-08-08",
        startAt: "2026-08-08T18:00:00+09:00",
        endAt: "2026-08-08T21:30:00+09:00",
        reserveUrl: "https://yoyaku.koto-sports.net/",
      },
    ]);
  });

  it("渡した slotDate / reserveUrl / facility を全枠に反映する", () => {
    const slots = parseAvailability(fixture("result-mixed.html"), {
      slotDate: "2026-09-13",
      reserveUrl: "https://example.test/reserve",
      facility: "koto-sports-x",
    });
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      expect(s.slotDate).toBe("2026-09-13");
      expect(s.startAt.startsWith("2026-09-13T")).toBe(true);
      expect(s.reserveUrl).toBe("https://example.test/reserve");
      expect(s.facility).toBe("koto-sports-x");
    }
  });

  it("予約リスト(カート)テーブルは空き枠として拾わない", () => {
    const slots = parseAvailability(fixture("result-mixed.html"), OPTS);
    // 予約リストの th は「日付/時間/室場名」。venueName に混入しないこと。
    expect(slots.every((s) => !s.venueName.includes("日付"))).toBe(true);
    expect(slots.every((s) => !s.venueName.includes("室場名"))).toBe(true);
  });

  it("selectdate hidden から表示日を YYYY-MM-DD で取り出す（空値は無視）", () => {
    expect(parseSelectDate(fixture("result-mixed.html"))).toBe("2026-08-08");
    expect(parseSelectDate("<html></html>")).toBeNull();
  });

  it("parseReiwaDate は令和を西暦にし、有効期限(まで)を除外する", () => {
    expect(parseReiwaDate("令和08年08月15日")).toBe("2026-08-15");
    // 会員の有効期限は「まで」付きなので拾わず、次の表示日を返す
    expect(
      parseReiwaDate("有効期限：令和09年01月31日まで … 令和08年08月15日"),
    ).toBe("2026-08-15");
    expect(parseReiwaDate("日付なし")).toBeNull();
  });

  it("全枠 Ｘ（空きゼロ）なら 0 件", () => {
    const slots = parseAvailability(fixture("result-all-full.html"), OPTS);
    expect(slots).toEqual([]);
  });

  it("hasAvailabilityGrid はグリッド有無を判定する（全埋まりは true）", () => {
    // 全埋まり(空きゼロ)でもグリッド自体は存在する → true
    expect(hasAvailabilityGrid(fixture("result-all-full.html"))).toBe(true);
    expect(hasAvailabilityGrid(fixture("result-mixed.html"))).toBe(true);
    // グリッド無し（レイアウト破壊相当・予約リストのみ）→ false
    expect(hasAvailabilityGrid("<html><body>no grid</body></html>")).toBe(false);
    expect(
      hasAvailabilityGrid(
        '<table class="reservation"><thead><tr><th>日付</th><th>時間</th></tr></thead><tbody></tbody></table>',
      ),
    ).toBe(false);
  });

  it("空文字・グリッド無しの HTML でも例外を投げず 0 件", () => {
    expect(parseAvailability("", OPTS)).toEqual([]);
    expect(parseAvailability("<html><body>no grid</body></html>", OPTS)).toEqual(
      [],
    );
  });
});
