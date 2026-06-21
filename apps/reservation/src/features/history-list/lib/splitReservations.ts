import type { MyReservationItem } from "@/entities/reservation";
import { isRebookable } from "./isRebookable";

export type SplitReservations = {
  /** `status='reserved'` AND `event.startAt > now`。`event.startAt` ASC */
  upcoming: ReadonlyArray<MyReservationItem>;
  /** `status='waitlist'` AND `event.startAt > now`。`event.startAt` ASC */
  waitlist: ReadonlyArray<MyReservationItem>;
  /**
   * `status='cancelled'` のすべて（受付可否を問わず）。
   * 受付可能（再予約可）な行を先頭に `event.startAt` ASC、続いて受付不可な行を `event.startAt` DESC。
   */
  cancelled: ReadonlyArray<MyReservationItem>;
  /** 上記いずれにも該当しない（attended / no_show / 過去 waitlist / 過去 reserved 不整合）。`event.startAt` DESC */
  past: ReadonlyArray<MyReservationItem>;
};

/**
 * 履歴画面用に予約配列を「予約中」「キャンセル待ち」「キャンセル済み」「過去」の 4 グループに分割する。
 *
 * - 予約中: `status='reserved'` AND 未来
 * - キャンセル待ち: `status='waitlist'` AND 未来 (満員イベントへの待機。過去ではない)
 * - キャンセル済み: `status='cancelled'` のすべて (再予約可な行を先頭に)
 * - 過去: 上記以外 (attended / no_show / 開催済み / 過去 waitlist 等)
 *
 * 仕様詳細は openspec/specs/reservation-history-page/spec.md の各グループ要件を参照。
 */
export function splitReservations(
  reservations: ReadonlyArray<MyReservationItem>,
  now: Date = new Date(),
): SplitReservations {
  const nowMs = now.getTime();
  const upcoming: MyReservationItem[] = [];
  const waitlist: MyReservationItem[] = [];
  const cancelled: MyReservationItem[] = [];
  const past: MyReservationItem[] = [];
  for (const r of reservations) {
    const startMs = Date.parse(r.event.startAt);
    const isFuture = !Number.isNaN(startMs) && startMs > nowMs;
    if (r.status === "cancelled") {
      cancelled.push(r);
    } else if (r.status === "reserved" && isFuture) {
      upcoming.push(r);
    } else if (r.status === "waitlist" && isFuture) {
      waitlist.push(r);
    } else {
      past.push(r);
    }
  }
  const asc = (a: MyReservationItem, b: MyReservationItem) =>
    a.event.startAt.localeCompare(b.event.startAt);
  const desc = (a: MyReservationItem, b: MyReservationItem) =>
    b.event.startAt.localeCompare(a.event.startAt);
  upcoming.sort(asc);
  waitlist.sort(asc);
  past.sort(desc);
  cancelled.sort(sortCancelled(now));
  return { upcoming, waitlist, cancelled, past };
}

/**
 * キャンセル済みグループの並び替え:
 *   1. 受付可能（再予約可）な行を先頭に、`event.startAt` ASC
 *   2. 続いて受付不可な行を、`event.startAt` DESC
 */
function sortCancelled(now: Date) {
  return (a: MyReservationItem, b: MyReservationItem): number => {
    const aRebook = isRebookable(a, now);
    const bRebook = isRebookable(b, now);
    if (aRebook !== bRebook) return aRebook ? -1 : 1;
    return aRebook
      ? a.event.startAt.localeCompare(b.event.startAt)
      : b.event.startAt.localeCompare(a.event.startAt);
  };
}
