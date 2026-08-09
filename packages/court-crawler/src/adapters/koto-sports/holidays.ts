import holiday_jp from "@holiday-jp/holiday_jp";

/**
 * `YYYY-MM-DD` が日本の祝日（振替休日・国民の休日含む）か。
 * JST 正午の Date で判定し、実行環境のタイムゾーンによる日ずれを避ける。
 * コア {@link "../../core/filter".filterTargetSlots} の `isHoliday` に渡す。
 */
export function isJapaneseHoliday(ymd: string): boolean {
  const d = new Date(`${ymd}T12:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return false;
  return holiday_jp.isHoliday(d);
}
