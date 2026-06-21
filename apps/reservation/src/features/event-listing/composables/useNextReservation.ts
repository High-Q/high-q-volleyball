import { ref, shallowRef, type Ref } from "vue";
import {
  fetchMyReservations,
  type MyReservationItem,
  type EventId,
  type ReservationId,
} from "@/entities/reservation";

export type NextReservationState = {
  reservation: Ref<MyReservationItem | null>;
  /**
   * event_id → reservation_id の対応 Map。
   * status='reserved' かつ event.startAt > now の予約のみが含まれる。
   * NEXT に昇格した最早 1 件も含む (Map 操作の素直さ優先)。
   */
  mineByEventId: Ref<ReadonlyMap<EventId, ReservationId>>;
  /**
   * event_id → reservation_id の対応 Map (キャンセル待ち用)。
   * status='waitlist' かつ event.startAt > now の予約のみが含まれる。
   * 「他のイベント」行に「キャンセル待ち」バッジを出す判定に使う。
   */
  waitlistByEventId: Ref<ReadonlyMap<EventId, ReservationId>>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reload: () => Promise<void>;
};

/**
 * ホーム画面 NEXT カード + 「他のイベント」自分予約マップ用 — 自分の予約データソース。
 *
 * 自分の `reserved` かつ未来の予約をすべて取得し、以下を派生する:
 *   - `reservation`: 最早 1 件 (NEXT カード用)
 *   - `mineByEventId`: event_id → reservation_id の Map (「他のイベント」内の自分予約行判定用)
 *
 * 抽出条件 (両者で共通):
 *   - status === 'reserved' (キャンセル / 参加済 / no_show / waitlist を除外)
 *   - event.startAt > now() (過去 / 開催開始時点を除外)
 *
 * 自分の予約は会員 1 人あたり MVP1 規模 (年間 ≤ 50) で完結するため、
 * 専用クエリを切らず既存 API を再利用する判断 (design.md 参照)。
 */
export function useNextReservation(uid: string): NextReservationState {
  const reservation = shallowRef<MyReservationItem | null>(null);
  const mineByEventId = shallowRef<ReadonlyMap<EventId, ReservationId>>(
    new Map(),
  );
  const waitlistByEventId = shallowRef<ReadonlyMap<EventId, ReservationId>>(
    new Map(),
  );
  const loading = ref<boolean>(true);
  const error = ref<Error | null>(null);

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const items = await fetchMyReservations(uid);
      const now = new Date();
      const upcoming = filterUpcomingReserved(items, now);
      reservation.value = pickEarliest(upcoming);
      mineByEventId.value = toEventIdMap(upcoming);
      waitlistByEventId.value = toEventIdMap(
        filterUpcomingByStatus(items, "waitlist", now),
      );
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
      reservation.value = null;
      mineByEventId.value = new Map();
      waitlistByEventId.value = new Map();
    } finally {
      loading.value = false;
    }
  }

  void reload();

  return {
    reservation,
    mineByEventId,
    waitlistByEventId,
    loading,
    error,
    reload,
  };
}

function filterUpcomingByStatus(
  items: readonly MyReservationItem[],
  status: MyReservationItem["status"],
  now: Date,
): MyReservationItem[] {
  const nowMs = now.getTime();
  return items.filter((item) => {
    if (item.status !== status) return false;
    const startMs = new Date(item.event.startAt).getTime();
    if (Number.isNaN(startMs)) return false;
    return startMs > nowMs;
  });
}

function filterUpcomingReserved(
  items: readonly MyReservationItem[],
  now: Date,
): MyReservationItem[] {
  return filterUpcomingByStatus(items, "reserved", now);
}

function pickEarliest(
  items: readonly MyReservationItem[],
): MyReservationItem | null {
  if (items.length === 0) return null;
  return items.reduce((earliest, current) => {
    const e = new Date(earliest.event.startAt).getTime();
    const c = new Date(current.event.startAt).getTime();
    return c < e ? current : earliest;
  });
}

function toEventIdMap(
  items: readonly MyReservationItem[],
): ReadonlyMap<EventId, ReservationId> {
  const map = new Map<EventId, ReservationId>();
  for (const item of items) {
    map.set(item.event.id, item.id);
  }
  return map;
}
