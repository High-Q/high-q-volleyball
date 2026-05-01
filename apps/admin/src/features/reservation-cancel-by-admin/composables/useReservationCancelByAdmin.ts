import { ref, type Ref } from "vue";
import type { ReservationId } from "@high-q/shared";
import {
  cancelByAdmin,
  type ReservationMutationError,
} from "@/entities/reservation";
import { useToast } from "@/shared/ui/useToast";

/**
 * admin による予約キャンセル代行 composable。
 *
 * フロー: open() → AlertDialog 表示 → confirm() で UPDATE → 成功は Toast + close
 *        失敗は inline error を Dialog 内に保持
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D4)
 */

const ERROR_MESSAGES: Record<ReservationMutationError["code"], string> = {
  NETWORK_ERROR: "通信に失敗しました。再度お試しください。",
  SERVER_ERROR: "サーバーエラーが発生しました。",
  PERMISSION_DENIED: "操作権限がありません。",
  ALREADY_UPDATED: "既にキャンセル済みです。",
};

export function getCancelErrorMessage(error: ReservationMutationError): string {
  return ERROR_MESSAGES[error.code] ?? error.message;
}

export interface UseReservationCancelByAdmin {
  isOpen: Ref<boolean>;
  isCancelling: Ref<boolean>;
  cancelError: Ref<ReservationMutationError | null>;
  open: () => void;
  cancel: () => void;
  /** 成功時に caller の onSuccess（行除去 / refetch）が呼ばれる */
  confirm: (onSuccess?: () => void) => Promise<void>;
}

export function useReservationCancelByAdmin(
  reservationId: ReservationId,
): UseReservationCancelByAdmin {
  const { toast } = useToast();
  const isOpen = ref(false);
  const isCancelling = ref(false);
  const cancelError = ref<ReservationMutationError | null>(null);

  function open(): void {
    cancelError.value = null;
    isOpen.value = true;
  }

  function cancel(): void {
    isOpen.value = false;
  }

  async function confirm(onSuccess?: () => void): Promise<void> {
    cancelError.value = null;
    isCancelling.value = true;
    try {
      const result = await cancelByAdmin(reservationId);
      if (!result.ok) {
        cancelError.value = result.error;
        return;
      }
      isOpen.value = false;
      toast({ title: "キャンセルしました" });
      onSuccess?.();
    } finally {
      isCancelling.value = false;
    }
  }

  return { isOpen, isCancelling, cancelError, open, cancel, confirm };
}
