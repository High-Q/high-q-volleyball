import { ref, type Ref } from "vue";
import { useRouter } from "vue-router";
import type { EventId } from "@high-q/shared";
import { deleteEvent, type FetchError } from "@/entities/event";
import { useToast } from "@/shared/ui/useToast";

/**
 * 削除ボタン押下 → AlertDialog で確認 → DELETE → Toast → /events redirect の
 * 一連を扱う composable。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (D5, §3.4)
 */

export interface UseEventDelete {
  isOpen: Ref<boolean>;
  isDeleting: Ref<boolean>;
  deleteError: Ref<FetchError | null>;
  open: () => void;
  cancel: () => void;
  confirm: () => Promise<void>;
}

const ERROR_MESSAGES: Record<FetchError["code"], string> = {
  NETWORK_ERROR: "ネットワークエラーが発生しました。再度お試しください。",
  SERVER_ERROR: "サーバーエラーが発生しました。再度お試しください。",
  PERMISSION_DENIED: "このイベントを削除する権限がありません。",
  RESERVATIONS_EXIST:
    "予約があるため削除できません。先にすべての予約をキャンセルしてください。",
};

export function getDeleteErrorMessage(error: FetchError): string {
  return ERROR_MESSAGES[error.code] ?? error.message;
}

export function useEventDelete(eventId: string): UseEventDelete {
  const router = useRouter();
  const { toast } = useToast();
  const isOpen = ref<boolean>(false);
  const isDeleting = ref<boolean>(false);
  const deleteError = ref<FetchError | null>(null);

  function open(): void {
    deleteError.value = null;
    isOpen.value = true;
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
      toast({ title: "削除しました" });
      await router.push("/events");
    } finally {
      isDeleting.value = false;
    }
  }

  return { isOpen, isDeleting, deleteError, open, cancel, confirm };
}
