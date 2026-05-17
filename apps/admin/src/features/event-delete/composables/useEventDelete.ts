import { computed, ref, type ComputedRef, type Ref } from "vue";
import { useRouter } from "vue-router";
import type { EventId } from "@high-q/shared";
import {
  classifyEventReservations,
  deleteEvent,
  type EventReservationBreakdown,
  type FetchError,
} from "@/entities/event";
import { useToast } from "@/shared/ui/useToast";

/**
 * 削除ボタン押下 → AlertDialog で予約内訳を提示 → 確認 → DELETE → Toast →
 * /events redirect の一連を扱う composable。
 *
 * #253 の方針変更により、有効予約があっても主催者の判断で削除可能 (FK CASCADE)。
 * 内訳は誤操作防止のため AlertDialog に提示する。
 *
 * 関連:
 *   openspec/changes/fix-admin-event-delete-cancelled-reservations/specs/admin-events-crud/spec.md
 */

export interface UseEventDelete {
  isOpen: Ref<boolean>;
  isDeleting: Ref<boolean>;
  breakdown: Ref<EventReservationBreakdown | null>;
  isLoadingBreakdown: Ref<boolean>;
  breakdownError: Ref<FetchError | null>;
  deleteError: Ref<FetchError | null>;
  canConfirm: ComputedRef<boolean>;
  open: () => Promise<void>;
  cancel: () => void;
  confirm: () => Promise<void>;
}

const ERROR_MESSAGES: Record<FetchError["code"], string> = {
  NETWORK_ERROR: "ネットワークエラーが発生しました。再度お試しください。",
  SERVER_ERROR: "サーバーエラーが発生しました。再度お試しください。",
  PERMISSION_DENIED: "このイベントを削除する権限がありません。",
};

export function getDeleteErrorMessage(error: FetchError): string {
  return ERROR_MESSAGES[error.code] ?? error.message;
}

export function activeCount(b: EventReservationBreakdown): number {
  return b.reserved + b.attended;
}

export function historyCount(b: EventReservationBreakdown): number {
  return b.cancelled + b.no_show + b.waitlist;
}

export function totalCount(b: EventReservationBreakdown): number {
  return activeCount(b) + historyCount(b);
}

export function useEventDelete(eventId: string): UseEventDelete {
  const router = useRouter();
  const { toast } = useToast();
  const isOpen = ref<boolean>(false);
  const isDeleting = ref<boolean>(false);
  const breakdown = ref<EventReservationBreakdown | null>(null);
  const isLoadingBreakdown = ref<boolean>(false);
  const breakdownError = ref<FetchError | null>(null);
  const deleteError = ref<FetchError | null>(null);

  const canConfirm = computed<boolean>(
    () =>
      !isDeleting.value &&
      !isLoadingBreakdown.value &&
      breakdownError.value === null &&
      breakdown.value !== null,
  );

  async function loadBreakdown(): Promise<void> {
    isLoadingBreakdown.value = true;
    breakdownError.value = null;
    breakdown.value = null;
    try {
      const result = await classifyEventReservations(
        eventId as unknown as EventId,
      );
      if (result.ok) {
        breakdown.value = result.value;
      } else {
        breakdownError.value = result.error;
      }
    } finally {
      isLoadingBreakdown.value = false;
    }
  }

  async function open(): Promise<void> {
    deleteError.value = null;
    isOpen.value = true;
    await loadBreakdown();
  }

  function cancel(): void {
    isOpen.value = false;
  }

  async function confirm(): Promise<void> {
    deleteError.value = null;
    isDeleting.value = true;
    try {
      const result = await deleteEvent(eventId as unknown as EventId);
      if (!result.ok) {
        deleteError.value = result.error;
        return;
      }
      isOpen.value = false;
      const total = breakdown.value ? totalCount(breakdown.value) : 0;
      toast({
        title:
          total > 0
            ? `削除しました（${total} 件の予約も整理されました）`
            : "削除しました",
      });
      await router.push("/events");
    } finally {
      isDeleting.value = false;
    }
  }

  return {
    isOpen,
    isDeleting,
    breakdown,
    isLoadingBreakdown,
    breakdownError,
    deleteError,
    canConfirm,
    open,
    cancel,
    confirm,
  };
}
