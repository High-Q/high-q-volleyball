import { formatAvailability } from "@/entities/event";
import type { MyReservationItem } from "@/entities/reservation";

/**
 * キャンセル済予約が「再予約可能」か（= 履歴の「再予約する」CTA を出すか）を判定する。
 *
 * 受付可否は新規予約と同一基準に揃える:
 *   - `status === 'cancelled'`
 *   - イベント未開催（`event.startAt > now`）
 *   - 満席でない（`formatAvailability(availability).isFull === false`）
 *
 * キャンセル可能期限（前日中）の `isCancellable` ではなく「未開催」を採用する。
 * 再予約は実質的に新規予約であり、イベント詳細の予約 CTA と挙動を一致させるため。
 *
 * 仕様: openspec/specs/reservation-history-page/spec.md「キャンセル済みグループ」要件。
 */
export function isRebookable(item: MyReservationItem, now: Date): boolean {
  if (item.status !== "cancelled") return false;
  const startMs = Date.parse(item.event.startAt);
  if (Number.isNaN(startMs)) return false;
  if (startMs <= now.getTime()) return false;
  return !formatAvailability(item.event.availability).isFull;
}
