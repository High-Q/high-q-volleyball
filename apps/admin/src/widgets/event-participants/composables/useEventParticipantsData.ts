import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from "vue";
import type { EventId } from "@high-q/shared";
import {
  getEventParticipants,
  type ParticipantRow,
  type ParticipantFetchErrorCode,
} from "@/entities/reservation";
import {
  useParticipantsFilter,
  type ParticipantsFilter,
} from "@/features/participants-filter";

/**
 * /events/:id 画面の参加者データ取得 + クライアント filter 適用 composable。
 *
 * - サーバ取得は `getEventParticipants(eventId)` で 1 回のみ（cancelled 除外済 view）
 * - 検索 / 経験 / チェックイン状態フィルタはクライアント側で fold
 *   （MVP1 想定の参加者数 < 18 件では性能要件を満たす）
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D1)
 */

export interface UseEventParticipantsData {
  /** サーバ取得の生 list */
  rawData: Ref<ReadonlyArray<ParticipantRow>>;
  /** filter 適用後の表示 list */
  data: ComputedRef<ReadonlyArray<ParticipantRow>>;
  isPending: Ref<boolean>;
  isError: Ref<boolean>;
  errorCode: Ref<ParticipantFetchErrorCode | null>;
  /** 取得済みかつエラーなしで 0 件か */
  isEmpty: ComputedRef<boolean>;
  /** filter 適用後の件数 */
  visibleCount: ComputedRef<number>;
  /** チェックイン済件数（filter 影響しない、StatCard 連携用） */
  checkedInCount: ComputedRef<number>;
  refetch: () => Promise<void>;
  /** Optimistic 更新: 行の checked_in_at をローカルで反転 */
  applyCheckinFlip: (reservationId: string, nextChecked: boolean) => void;
  /** Optimistic 更新: 行の guest_count をローカルで書き換え */
  applyGuestUpdate: (reservationId: string, nextCount: number) => void;
  /** Optimistic 削除: 指定 reservation を rawData から除く（キャンセル代行成功時） */
  removeRow: (reservationId: string) => void;
}

function applyFilter(
  rows: ReadonlyArray<ParticipantRow>,
  filter: ParticipantsFilter,
): ReadonlyArray<ParticipantRow> {
  let out = rows;
  if (filter.q.length > 0) {
    const q = filter.q.toLowerCase();
    out = out.filter(
      (r) =>
        r.display_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    );
  }
  if (filter.experience !== undefined) {
    out = out.filter((r) => r.experience_level === filter.experience);
  }
  if (filter.checkinState === "checked") {
    out = out.filter((r) => r.checked_in_at !== null);
  } else if (filter.checkinState === "unchecked") {
    out = out.filter((r) => r.checked_in_at === null);
  }
  return out;
}

export function useEventParticipantsData(
  eventId: Ref<EventId | null>,
): UseEventParticipantsData {
  const { filter } = useParticipantsFilter();

  const rawData = ref<ReadonlyArray<ParticipantRow>>([]) as Ref<
    ReadonlyArray<ParticipantRow>
  >;
  const isPending = ref(false);
  const isError = ref(false);
  const errorCode = ref<ParticipantFetchErrorCode | null>(null);

  let requestSeq = 0;

  async function load(): Promise<void> {
    if (eventId.value === null) {
      rawData.value = [];
      return;
    }
    const seq = ++requestSeq;
    isPending.value = true;
    isError.value = false;
    errorCode.value = null;

    const result = await getEventParticipants(eventId.value);
    if (seq !== requestSeq) return;

    if (result.ok) {
      rawData.value = result.value;
    } else {
      isError.value = true;
      errorCode.value = result.error.code;
    }
    isPending.value = false;
  }

  void load();

  watch(eventId, () => {
    void load();
  });

  // 他 admin の変更取り込み: タブ foreground 復帰で refetch
  function onVisibilityChange(): void {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      void load();
    }
  }
  onMounted(() => {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
  });
  onUnmounted(() => {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  });

  const data = computed(() => applyFilter(rawData.value, filter.value));

  const isEmpty = computed(
    () =>
      !isPending.value &&
      !isError.value &&
      rawData.value.length === 0,
  );

  const visibleCount = computed(() => data.value.length);

  const checkedInCount = computed(
    () => rawData.value.filter((r) => r.checked_in_at !== null).length,
  );

  function applyCheckinFlip(
    reservationId: string,
    nextChecked: boolean,
  ): void {
    rawData.value = rawData.value.map((r) =>
      (r.reservation_id as unknown as string) === reservationId
        ? {
            ...r,
            checked_in_at: nextChecked ? new Date().toISOString() : null,
            status: nextChecked ? "attended" : "reserved",
          }
        : r,
    );
  }

  function applyGuestUpdate(
    reservationId: string,
    nextCount: number,
  ): void {
    rawData.value = rawData.value.map((r) =>
      (r.reservation_id as unknown as string) === reservationId
        ? { ...r, guest_count: nextCount }
        : r,
    );
  }

  function removeRow(reservationId: string): void {
    rawData.value = rawData.value.filter(
      (r) => (r.reservation_id as unknown as string) !== reservationId,
    );
  }

  return {
    rawData,
    data,
    isPending,
    isError,
    errorCode,
    isEmpty,
    visibleCount,
    checkedInCount,
    refetch: load,
    applyCheckinFlip,
    applyGuestUpdate,
    removeRow,
  };
}
