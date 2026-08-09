import type { AvailabilitySlot } from "./types.js";
import { WEEKDAY_JA, dayOfWeekOfDate, parseYmd, toJstHm } from "./date.js";

/** 1 枠を「会場名 / 日時（曜日つき）/ 予約 URL」の 3 行に整形する。 */
export function formatSlotLine(slot: AvailabilitySlot): string {
  const p = parseYmd(slot.slotDate);
  const dow = dayOfWeekOfDate(slot.slotDate);
  const dateLabel =
    p && dow !== null
      ? `${p.month}月${p.day}日(${WEEKDAY_JA[dow]})`
      : slot.slotDate;
  const time = `${toJstHm(slot.startAt)}〜${toJstHm(slot.endAt)}`;
  return `▼ ${slot.venueName}\n${dateLabel} ${time}\n${slot.reserveUrl}`;
}

/**
 * 複数の空き枠を 1 通のメッセージに集約する（LINE 無料枠の通数節約）。
 * 空配列なら空文字（送信しないことを呼び出し側が判断する）。
 */
export function formatNotification(slots: readonly AvailabilitySlot[]): string {
  if (slots.length === 0) return "";
  const header = `🏐 空き枠が見つかりました（${slots.length}件）`;
  return [header, ...slots.map(formatSlotLine)].join("\n\n");
}
