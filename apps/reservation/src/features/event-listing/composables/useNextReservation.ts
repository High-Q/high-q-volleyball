import { ref, shallowRef, type Ref } from "vue";
import {
  fetchMyReservations,
  type MyReservationItem,
} from "@/entities/reservation";

export type NextReservationState = {
  reservation: Ref<MyReservationItem | null>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  reload: () => Promise<void>;
};

/**
 * ホーム画面 NEXT カード用 — 自分の最早の未来予約 1 件を返す。
 *
 * 抽出条件:
 *   - status === 'reserved' (キャンセル / 参加済 / no_show / waitlist を除外)
 *   - event.startAt > now() (過去 / 開催開始時点を除外)
 *   - event.startAt 昇順で先頭 1 件
 *
 * `fetchMyReservations` の戻りに対するクライアント側フィルタ + ソートで実現する。
 * 自分の予約は会員 1 人あたり MVP1 規模 (年間 ≤ 50) で完結するため、
 * 専用クエリを切らず既存 API を再利用する判断 (design.md 参照)。
 */
export function useNextReservation(uid: string): NextReservationState {
  const reservation = shallowRef<MyReservationItem | null>(null);
  const loading = ref<boolean>(true);
  const error = ref<Error | null>(null);

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const items = await fetchMyReservations(uid);
      reservation.value = pickNext(items, new Date());
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error(String(cause));
      reservation.value = null;
    } finally {
      loading.value = false;
    }
  }

  void reload();

  return { reservation, loading, error, reload };
}

function pickNext(
  items: readonly MyReservationItem[],
  now: Date,
): MyReservationItem | null {
  const nowMs = now.getTime();
  const future = items.filter((item) => {
    if (item.status !== "reserved") return false;
    const startMs = new Date(item.event.startAt).getTime();
    if (Number.isNaN(startMs)) return false;
    return startMs > nowMs;
  });
  if (future.length === 0) return null;
  return future.reduce((earliest, current) => {
    const e = new Date(earliest.event.startAt).getTime();
    const c = new Date(current.event.startAt).getTime();
    return c < e ? current : earliest;
  });
}
