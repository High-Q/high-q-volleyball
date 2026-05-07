import type { MyReservationItem } from "@/entities/reservation";

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
  // カレンダー日付差: 「同日中は 0 日」「翌日 0 時以降は 1 日」になるよう、
  // 時刻成分を切り捨てた日付同士の差を返す。Math.ceil(ms/day) だと 12 時間
  // 後を 1 日、5 日 10 時間後を 6 日として丸めるため UX の直感と乖離する。
  const startDate = new Date(
    earliest.getFullYear(),
    earliest.getMonth(),
    earliest.getDate(),
  );
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((startDate.getTime() - nowDate.getTime()) / MS_PER_DAY);
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
    monthKeys.add(monthKey(d));
  }
  if (monthKeys.size === 0) return 0;

  // 最新月から逆順にカウント。現在月から始め、参加月であればカウント、なければ
  // 1 月だけ前にずらして再判定 (現在月に未参加でも前月に参加があれば streak は継続)。
  let cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  let count = 0;

  // 現在月に参加なし AND 前月に参加なしなら streak は 0
  if (!monthKeys.has(monthKey(cursor))) {
    const prev = new Date(cursor);
    prev.setMonth(prev.getMonth() - 1);
    if (!monthKeys.has(monthKey(prev))) return 0;
    cursor = prev;
  }

  while (monthKeys.has(monthKey(cursor))) {
    count += 1;
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return count;
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}
