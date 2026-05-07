import { jstStartOfDay } from "@/shared/lib/jst-calendar";

/**
 * Dark Fact Card のカウントダウン kicker 文字列とトーンを生成する。
 *
 * - `events.start_at <= now()` → 「— 開催終了」 (ended)
 * - JST カレンダー日付一致 → 「— 当日」 (imminent)
 * - 翌日〜開催 7 日前 → 「— あと N 日」 (imminent — accent 色)
 * - それ以外 (8 日以上先) → 「— あと N 日」 (normal — muted 色)
 *
 * 残日数が遠い予約に accent (赤系) を使うと「緊急性のノイズ」になるため、
 * 直近 7 日以内のみ accent、それ以遠は muted を使用する。
 *
 * 関連:
 *   openspec/changes/reservation-detail-edit/specs/reservation-detail-page/spec.md
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const IMMINENT_THRESHOLD_DAYS = 7;

export type CountdownTone = "imminent" | "normal" | "ended";

export type CountdownInfo = {
  label: string;
  tone: CountdownTone;
};

export function formatCountdown(
  startAt: string,
  now: Date = new Date(),
): CountdownInfo {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) {
    return { label: "—", tone: "ended" };
  }
  if (start.getTime() <= now.getTime()) {
    return { label: "— 開催終了", tone: "ended" };
  }
  const startDay = jstStartOfDay(start).getTime();
  const nowDay = jstStartOfDay(now).getTime();
  const diffDays = Math.round((startDay - nowDay) / MS_PER_DAY);
  if (diffDays <= 0) {
    return { label: "— 当日", tone: "imminent" };
  }
  return {
    label: `— あと ${diffDays} 日`,
    tone: diffDays <= IMMINENT_THRESHOLD_DAYS ? "imminent" : "normal",
  };
}

/**
 * 後方互換用: ラベル文字列のみが必要な呼び出し側向け。
 */
export function formatCountdownLabel(
  startAt: string,
  now: Date = new Date(),
): string {
  return formatCountdown(startAt, now).label;
}
