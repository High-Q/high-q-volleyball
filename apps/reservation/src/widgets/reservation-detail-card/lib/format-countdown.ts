import { jstStartOfDay } from "@/shared/lib/jst-calendar";

/**
 * Dark Fact Card のカウントダウン kicker 文字列を生成する。
 *
 * - `events.start_at <= now()` → 「— 開催終了」
 * - JST カレンダー日付一致 → 「— 当日」
 * - それ以外 (未来) → 「— あと N 日」 (N >= 1)
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 *     Requirement: Dark Fact Card
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatCountdownLabel(startAt: string, now: Date = new Date()): string {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) {
    return "—";
  }
  if (start.getTime() <= now.getTime()) {
    return "— 開催終了";
  }
  const startDay = jstStartOfDay(start).getTime();
  const nowDay = jstStartOfDay(now).getTime();
  const diffDays = Math.round((startDay - nowDay) / MS_PER_DAY);
  if (diffDays <= 0) {
    return "— 当日";
  }
  return `— あと ${diffDays} 日`;
}
