import type { MyReservationItem } from "@/entities/reservation";

export type ProfileStats = {
  attendedCount: number;
  /** ISO 8601 文字列。未参加なら null */
  lastAttendedAt: string | null;
  /** 次回 reserved AND start_at > now の予約 (event 含む)。0 件なら null */
  nextUpcoming: MyReservationItem | null;
};

/**
 * プロフィール画面 STATS セクション用の集計を予約配列から純粋関数として算出する。
 *
 * - `attendedCount` = `status='attended'` の件数
 * - `lastAttendedAt` = attended の中で最大の events.start_at
 * - `nextUpcoming` = `status='reserved'` AND `events.start_at > now` の中で最早 events.start_at の予約
 *
 * `event_participants_view` 等の DB view には依存しない。
 */
export function computeStats(
  reservations: ReadonlyArray<MyReservationItem>,
  now: Date = new Date(),
): ProfileStats {
  const attended = reservations.filter((r) => r.status === "attended");
  const attendedCount = attended.length;

  let lastAttendedAt: string | null = null;
  for (const r of attended) {
    if (lastAttendedAt === null || r.event.startAt > lastAttendedAt) {
      lastAttendedAt = r.event.startAt;
    }
  }

  const nowMs = now.getTime();
  let nextUpcoming: MyReservationItem | null = null;
  for (const r of reservations) {
    if (r.status !== "reserved") continue;
    const startMs = Date.parse(r.event.startAt);
    if (Number.isNaN(startMs)) continue;
    if (startMs <= nowMs) continue;
    if (
      nextUpcoming === null ||
      r.event.startAt < nextUpcoming.event.startAt
    ) {
      nextUpcoming = r;
    }
  }

  return { attendedCount, lastAttendedAt, nextUpcoming };
}
