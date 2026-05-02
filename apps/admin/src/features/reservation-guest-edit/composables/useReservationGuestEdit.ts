import { reactive } from "vue";
import type { ReservationId } from "@high-q/shared";
import {
  updateGuestCount,
  type ReservationMutationError,
} from "@/entities/reservation";
import { useToast } from "@/shared/ui/useToast";

/**
 * 同伴者数 (guest_count) のインライン編集 composable。
 *
 * - Optimistic UI: caller 側で先に表示を更新し、本 composable には
 *   反転前の `prevCount` を渡す
 * - in-flight ガード: 同 reservation_id への mutation 中の重複発火を無視
 * - 失敗時: caller の rollback コールバックを呼び、Toast でエラー表示
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

const ERROR_MESSAGES: Record<ReservationMutationError["code"], string> = {
  NETWORK_ERROR: "通信に失敗しました。再度お試しください。",
  SERVER_ERROR: "更新に失敗しました。",
  PERMISSION_DENIED: "操作権限がありません。",
  ALREADY_UPDATED: "他の操作で状態が更新されました。",
};

export interface SetGuestArgs {
  reservationId: ReservationId;
  prevCount: number;
  nextCount: number;
  /** 失敗時に caller の optimistic state を戻す */
  onRollback: () => void;
}

export interface UseReservationGuestEdit {
  inFlight: Set<string>;
  isInFlight: (reservationId: ReservationId) => boolean;
  setGuestCount: (args: SetGuestArgs) => Promise<void>;
}

export function useReservationGuestEdit(): UseReservationGuestEdit {
  const inFlight = reactive(new Set<string>());
  const { toast } = useToast();

  function isInFlight(reservationId: ReservationId): boolean {
    return inFlight.has(reservationId as unknown as string);
  }

  async function setGuestCount(args: SetGuestArgs): Promise<void> {
    const idStr = args.reservationId as unknown as string;
    if (inFlight.has(idStr)) return;
    if (args.prevCount === args.nextCount) return;
    inFlight.add(idStr);

    try {
      const result = await updateGuestCount(
        args.reservationId,
        args.nextCount,
      );
      if (!result.ok) {
        args.onRollback();
        toast({
          title: "同伴者数の更新に失敗しました",
          description:
            ERROR_MESSAGES[result.error.code] ?? result.error.message,
          variant: "destructive",
        });
      }
    } finally {
      inFlight.delete(idStr);
    }
  }

  return { inFlight, isInFlight, setGuestCount };
}
