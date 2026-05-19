import { computed, ref, type ComputedRef, type Ref } from "vue";
import { useRouter } from "vue-router";
import type { EventId } from "@high-q/shared";
import {
  classifyEventReservations,
  deleteEvent,
  fetchActiveReservationRecipients,
  fetchEventCancellationMeta,
  type ActiveReservationRecipient,
  type EventCancellationMeta,
  type EventReservationBreakdown,
  type FetchError,
} from "@/entities/event";
import { triggerEventCancellationNotification } from "@/shared/api/event-cancellation-notification";
import { useToast } from "@/shared/ui/useToast";

function formatStartAtJst(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const fmt = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return fmt.format(d);
  } catch {
    return iso;
  }
}

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
  // 削除確認 Dialog でプレビュー本文描画に使う event meta スナップショット。
  // open() 時に取得済。取得失敗時は null のまま (プレビューは非表示)。
  meta: Ref<EventCancellationMeta | null>;
  // open() 時にスナップショット取得した有効予約者リスト。confirm() で再利用する。
  recipients: Ref<ActiveReservationRecipient[]>;
  open: () => Promise<void>;
  cancel: () => void;
  confirm: (organizerMessage?: string) => Promise<void>;
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
  const meta = ref<EventCancellationMeta | null>(null);
  const recipients = ref<ActiveReservationRecipient[]>([]);

  const canConfirm = computed<boolean>(
    () =>
      !isDeleting.value &&
      !isLoadingBreakdown.value &&
      breakdownError.value === null &&
      breakdown.value !== null,
  );

  async function loadSnapshot(): Promise<void> {
    isLoadingBreakdown.value = true;
    breakdownError.value = null;
    breakdown.value = null;
    meta.value = null;
    recipients.value = [];
    try {
      const [breakdownResult, recipientsResult, metaResult] = await Promise.all(
        [
          classifyEventReservations(eventId as unknown as EventId),
          fetchActiveReservationRecipients(eventId as unknown as EventId),
          fetchEventCancellationMeta(eventId as unknown as EventId),
        ],
      );
      if (breakdownResult.ok) {
        breakdown.value = breakdownResult.value;
      } else {
        breakdownError.value = breakdownResult.error;
      }
      if (recipientsResult.ok) {
        recipients.value = recipientsResult.value;
      } else {
        // 取得失敗は warn のみ。確認自体は breakdown 取得結果でガード済。
        console.warn(
          `[useEventDelete] recipients snapshot failed (notification will be skipped) eventId=${eventId}`,
          recipientsResult.error,
        );
      }
      if (metaResult.ok) {
        meta.value = metaResult.value;
      } else {
        console.warn(
          `[useEventDelete] event meta snapshot failed (preview unavailable) eventId=${eventId}`,
          metaResult.error,
        );
      }
    } finally {
      isLoadingBreakdown.value = false;
    }
  }

  async function open(): Promise<void> {
    deleteError.value = null;
    isOpen.value = true;
    await loadSnapshot();
  }

  function cancel(): void {
    isOpen.value = false;
  }

  async function confirm(organizerMessage?: string): Promise<void> {
    deleteError.value = null;
    isDeleting.value = true;
    try {
      // (1) events を DELETE。reservations は FK CASCADE で連鎖削除。
      //     スナップショット (recipients / meta) は open() 時に取得済を再利用する。
      const result = await deleteEvent(eventId as unknown as EventId);
      if (!result.ok) {
        deleteError.value = result.error;
        return;
      }

      // (2) スナップショットが揃っていれば Edge Function を fire-and-forget で発火。
      //     失敗しても下位の Toast / redirect は妨げない MUST。
      if (recipients.value.length > 0 && meta.value) {
        try {
          void triggerEventCancellationNotification({
            eventId,
            eventName: meta.value.eventName,
            startAtJst: formatStartAtJst(meta.value.startAtIso),
            venueName: meta.value.venueName,
            snapshotRecipients: recipients.value,
            ...(organizerMessage !== undefined &&
            organizerMessage.trim().length > 0
              ? { organizerMessage: organizerMessage.trim() }
              : {}),
          });
        } catch (notifyErr) {
          console.warn(
            `[useEventDelete] notification trigger threw (ignored) eventId=${eventId}`,
            notifyErr,
          );
        }
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
    meta,
    recipients,
    open,
    cancel,
    confirm,
  };
}

// プレビュー描画用に外部から `formatStartAtJst` を再利用したいケース向けに export。
// Dialog 内では meta.startAtIso を JST 文字列に整形してレンダラに渡す。
export { formatStartAtJst };
