import type { AvailabilitySlot } from "./types.js";
import { dayOfWeekOfDate } from "./date.js";

export interface SlotFilterOptions {
  /** 判定基準の現在時刻。 */
  now: Date;
  /** 最小リードタイム（ミリ秒）。開始時刻がこれ未満の枠は通知しない。 */
  minLeadTimeMs: number;
  /**
   * 祝日判定（`YYYY-MM-DD` → 祝日か）。軽量に保つため注入式にする。
   * 呼び出し側が静的な祝日テーブル等を渡す。
   */
  isHoliday: (ymd: string) => boolean;
}

/** 土曜・日曜・祝日のいずれかなら true。 */
export function isTargetDay(
  slotDate: string,
  isHoliday: (ymd: string) => boolean,
): boolean {
  const dow = dayOfWeekOfDate(slotDate);
  if (dow === null) return false;
  return dow === 0 || dow === 6 || isHoliday(slotDate);
}

/**
 * 通知対象の枠だけに絞り込む。
 * - 土日祝の枠のみ（平日は除外）
 * - 開始時刻が「現在 + 最小リードタイム」以上（過去日・直近すぎる枠を除外）
 */
export function filterTargetSlots(
  slots: readonly AvailabilitySlot[],
  { now, minLeadTimeMs, isHoliday }: SlotFilterOptions,
): AvailabilitySlot[] {
  const cutoff = now.getTime() + minLeadTimeMs;
  return slots.filter((slot) => {
    const start = Date.parse(slot.startAt);
    if (Number.isNaN(start)) return false;
    if (start < cutoff) return false;
    return isTargetDay(slot.slotDate, isHoliday);
  });
}
