/** 曜日・日時整形のユーティリティ（施設非依存・タイムゾーン非依存の純関数）。 */

/** 日本語の曜日ラベル（0=日 .. 6=土）。 */
export const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** `YYYY-MM-DD` を { year, month, day } に分解する。妥当でなければ null。 */
export function parseYmd(
  ymd: string,
): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * 暦日から曜日を求める（Sakamoto のアルゴリズム）。0=日 .. 6=土。
 * 実行環境のタイムゾーンに依存せず、暦上の曜日を決定する。
 */
export function dayOfWeekFromYmd(year: number, month: number, day: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const y = month < 3 ? year - 1 : year;
  const offset = t[month - 1] ?? 0;
  return (
    (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + offset + day) % 7
  );
}

/** `YYYY-MM-DD` の曜日（0=日 .. 6=土）。不正なら null。 */
export function dayOfWeekOfDate(ymd: string): number | null {
  const p = parseYmd(ymd);
  if (!p) return null;
  return dayOfWeekFromYmd(p.year, p.month, p.day);
}

const JST_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** ISO8601 文字列を JST の `HH:MM` に整形する。 */
export function toJstHm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return JST_TIME.format(d);
}
