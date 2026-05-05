const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;
const TZ_OFFSET_MIN = 9 * 60;

type JstParts = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  weekday: number;
};

function toJstParts(iso: string): JstParts {
  const utc = new Date(iso);
  const jst = new Date(utc.getTime() + TZ_OFFSET_MIN * 60_000);
  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day: jst.getUTCDate(),
    hours: jst.getUTCHours(),
    minutes: jst.getUTCMinutes(),
    weekday: jst.getUTCDay(),
  };
}

const pad2 = (n: number): string => n.toString().padStart(2, "0");

/** ISO 8601 → "2026年5月8日 (金)" (JST)。 */
export function formatJaDate(iso: string): string {
  const { year, month, day, weekday } = toJstParts(iso);
  return `${year}年${month}月${day}日 (${WEEKDAY_JA[weekday]})`;
}

/** ISO 8601 ペア → "19:00-21:00" (JST)。 */
export function formatTimeRange(startIso: string, endIso: string): string {
  const s = toJstParts(startIso);
  const e = toJstParts(endIso);
  return `${pad2(s.hours)}:${pad2(s.minutes)}-${pad2(e.hours)}:${pad2(e.minutes)}`;
}

/** 円表示。NULL は "未定" を返す。1000 → "1,000 円"。 */
export function formatFee(yen: number | null): string {
  if (yen === null) {
    return "未定";
  }
  return `${yen.toLocaleString("ja-JP")} 円`;
}
