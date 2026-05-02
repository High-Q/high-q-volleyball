import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import type { EventId } from "@high-q/shared";
import {
  getEventDetail,
  type EventDetailRow,
  type FetchErrorCode,
} from "@/entities/event-detail";

/**
 * /events/:id 画面の event_detail_view 取得 composable。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md
 */

export interface UseEventDetailData {
  data: Ref<EventDetailRow | null>;
  isPending: Ref<boolean>;
  isError: Ref<boolean>;
  errorCode: Ref<FetchErrorCode | null>;
  refetch: () => Promise<void>;
  /** Optimistic 反映: chechked_in_count / reserved_count を delta で更新 */
  applyDeltas: (deltas: {
    checkin?: number;
    reserved?: number;
  }) => void;
}

export function useEventDetailData(
  eventId: Ref<EventId | null>,
): UseEventDetailData {
  const data = ref<EventDetailRow | null>(null);
  const isPending = ref(false);
  const isError = ref(false);
  const errorCode = ref<FetchErrorCode | null>(null);

  let requestSeq = 0;

  async function load(): Promise<void> {
    if (eventId.value === null) {
      data.value = null;
      return;
    }
    const seq = ++requestSeq;
    isPending.value = true;
    isError.value = false;
    errorCode.value = null;

    const result = await getEventDetail(eventId.value);
    if (seq !== requestSeq) return;

    if (result.ok) {
      data.value = result.value;
    } else {
      isError.value = true;
      errorCode.value = result.error.code;
      data.value = null;
    }
    isPending.value = false;
  }

  void load();

  watch(eventId, () => {
    void load();
  });

  // 他 admin が同時に変更した場合の取り込み: タブが foreground に戻ったら refetch
  // (visibilitychange は SSR 対策で window 存在チェック)
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

  function applyDeltas(deltas: {
    checkin?: number;
    reserved?: number;
  }): void {
    if (data.value === null) return;
    data.value = {
      ...data.value,
      checked_in_count:
        data.value.checked_in_count + (deltas.checkin ?? 0),
      reserved_count:
        data.value.reserved_count + (deltas.reserved ?? 0),
    };
  }

  return { data, isPending, isError, errorCode, refetch: load, applyDeltas };
}
