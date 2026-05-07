import type { MyReservationItem } from "@/entities/reservation";

export type SplitReservations = {
  /** `status='reserved'` AND `event.startAt > now`。`event.startAt` ASC */
  upcoming: ReadonlyArray<MyReservationItem>;
  /** 上記以外。`event.startAt` DESC */
  past: ReadonlyArray<MyReservationItem>;
};

/**
 * 履歴画面用に予約配列を「予約中」「過去」の 2 グループに分割する。
 *
 * 仕様詳細は openspec/specs/reservation-history-page/spec.md の
 * 「予約中グループ」「過去グループ」要件と design.md Decision 4 を参照。
 */
export function splitReservations(
  reservations: ReadonlyArray<MyReservationItem>,
  now: Date = new Date(),
): SplitReservations {
  const nowMs = now.getTime();
  const upcoming: MyReservationItem[] = [];
  const past: MyReservationItem[] = [];
  for (const r of reservations) {
    const startMs = Date.parse(r.event.startAt);
    if (
      r.status === "reserved" &&
      !Number.isNaN(startMs) &&
      startMs > nowMs
    ) {
      upcoming.push(r);
    } else {
      past.push(r);
    }
  }
  upcoming.sort((a, b) => a.event.startAt.localeCompare(b.event.startAt));
  past.sort((a, b) => b.event.startAt.localeCompare(a.event.startAt));
  return { upcoming, past };
}
