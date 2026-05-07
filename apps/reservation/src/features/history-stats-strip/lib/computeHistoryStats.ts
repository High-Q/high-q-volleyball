import type { MyReservationItem } from "@/entities/reservation";
import {
  jstMonth,
  jstStartOfDay,
  jstYear,
} from "@/shared/lib/jst-calendar";

export type HistoryStats = {
  /** `status='attended'` の予約数 */
  attendedCount: number;
  /** 次回 reserved AND start_at > now の予約までの切り上げ日数。0 件なら null */
  daysToNext: number | null;
  /** attended の `YYYY-MM` を最新月から逆順に隣接連続でカウントした月数。0 件 / 直近月に参加なしなら 0 */
  streakMonths: number;
};

const MS_PER_DAY = 86_400_000;

/**
 * 履歴画面 Stats Strip 用の集計を予約配列から純粋関数として算出する。
 *
 * 仕様詳細は openspec/specs/reservation-history-page/spec.md の
 * 「Stats Strip（TOTAL / NEXT / STREAK）」要件と design.md Decision 3 を参照。
 */
export function computeHistoryStats(
  reservations: ReadonlyArray<MyReservationItem>,
  now: Date = new Date(),
): HistoryStats {
  const attendedCount = reservations.filter((r) => r.status === "attended")
    .length;
  const daysToNext = computeDaysToNext(reservations, now);
  const streakMonths = computeStreakMonths(reservations, now);
  return { attendedCount, daysToNext, streakMonths };
}

function computeDaysToNext(
  reservations: ReadonlyArray<MyReservationItem>,
  now: Date,
): number | null {
  const nowMs = now.getTime();
  let earliest: Date | null = null;
  for (const r of reservations) {
    if (r.status !== "reserved") continue;
    const start = new Date(r.event.startAt);
    if (Number.isNaN(start.getTime())) continue;
    if (start.getTime() <= nowMs) continue;
    if (earliest === null || start.getTime() < earliest.getTime()) {
      earliest = start;
    }
  }
  if (earliest === null) return null;
  // カレンダー日付差 (JST): 「同日中は 0 日」「翌日 0 時以降は 1 日」になるよう、
  // JST の 0 時起点に丸めた日付同士の差を返す。Math.ceil(ms/day) だと 12 時間
  // 後を 1 日、5 日 10 時間後を 6 日として丸めるため UX の直感と乖離する。
  const startDay = jstStartOfDay(earliest);
  const nowDay = jstStartOfDay(now);
  return Math.round((startDay.getTime() - nowDay.getTime()) / MS_PER_DAY);
}

function computeStreakMonths(
  reservations: ReadonlyArray<MyReservationItem>,
  now: Date,
): number {
  const monthKeys = new Set<string>();
  for (const r of reservations) {
    if (r.status !== "attended") continue;
    const d = new Date(r.event.startAt);
    if (Number.isNaN(d.getTime())) continue;
    monthKeys.add(monthKeyFromDate(d));
  }
  if (monthKeys.size === 0) return 0;

  // 最新月から逆順にカウント (JST 暦)。現在月から始め、参加月であればカウント、
  // なければ 1 月だけ前にずらして再判定 (現在月に未参加でも前月に参加があれば
  // streak は継続)。
  let cursorYear = jstYear(now);
  let cursorMonth = jstMonth(now); // 0-indexed
  let count = 0;

  if (!monthKeys.has(formatMonthKey(cursorYear, cursorMonth))) {
    // 1 ヶ月前へ
    cursorMonth -= 1;
    if (cursorMonth < 0) {
      cursorMonth = 11;
      cursorYear -= 1;
    }
    if (!monthKeys.has(formatMonthKey(cursorYear, cursorMonth))) return 0;
  }

  while (monthKeys.has(formatMonthKey(cursorYear, cursorMonth))) {
    count += 1;
    cursorMonth -= 1;
    if (cursorMonth < 0) {
      cursorMonth = 11;
      cursorYear -= 1;
    }
  }
  return count;
}

function monthKeyFromDate(d: Date): string {
  return formatMonthKey(jstYear(d), jstMonth(d));
}

function formatMonthKey(year: number, monthZeroIndexed: number): string {
  const m = (monthZeroIndexed + 1).toString().padStart(2, "0");
  return `${year}-${m}`;
}
