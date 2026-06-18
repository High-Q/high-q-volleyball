import type { MyReservationItem } from "@/entities/reservation";

export type SplitReservations = {
  /** `status='reserved'` AND `event.startAt > now`。`event.startAt` ASC */
  upcoming: ReadonlyArray<MyReservationItem>;
  /** `status='waitlist'` AND `event.startAt > now`。`event.startAt` ASC */
  waitlist: ReadonlyArray<MyReservationItem>;
  /** 上記いずれにも該当しないもの。`event.startAt` DESC */
  past: ReadonlyArray<MyReservationItem>;
};

/**
 * 履歴画面用に予約配列を「予約中」「キャンセル待ち」「過去」の 3 グループに分割する。
 *
 * - 予約中: `status='reserved'` AND 未来
 * - キャンセル待ち: `status='waitlist'` AND 未来 (満員イベントへの待機。過去ではない)
 * - 過去: 上記以外 (attended / cancelled / no_show / 開催済み / 過去 waitlist 等)
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
  const past: MyReservationItem[] = [];
  for (const r of reservations) {
    const startMs = Date.parse(r.event.startAt);
    const isFuture = !Number.isNaN(startMs) && startMs > nowMs;
    if (r.status === "reserved" && isFuture) {
      upcoming.push(r);
    } else if (r.status === "waitlist" && isFuture) {
      waitlist.push(r);
    } else {
      past.push(r);
    }
  }
  upcoming.sort((a, b) => a.event.startAt.localeCompare(b.event.startAt));
  waitlist.sort((a, b) => a.event.startAt.localeCompare(b.event.startAt));
  past.sort((a, b) => b.event.startAt.localeCompare(a.event.startAt));
  return { upcoming, waitlist, past };
}
