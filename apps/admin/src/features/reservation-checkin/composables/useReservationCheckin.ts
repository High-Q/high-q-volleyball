import { reactive } from "vue";
import type { ReservationId } from "@high-q/shared";
import {
  toggleCheckin,
  type ReservationMutationError,
} from "@/entities/reservation";
import { useToast } from "@/shared/ui/useToast";

/**
 * 個別チェックインのトグル composable。
 *
 * - Optimistic UI: caller 側で先に state を反転させ、本 composable には
 *   反転前の `currentCheckedIn` を渡す
 * - in-flight ガード: 同一 reservationId への mutation が in-flight 中の場合
 *   2 回目以降の発火を無視（client side ガード）
 * - 失敗時: caller の rollback コールバックを呼び、Toast でエラー表示
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D3)
 */

const ERROR_MESSAGES: Record<ReservationMutationError["code"], string> = {
  NETWORK_ERROR: "通信に失敗しました。再度お試しください。",
  SERVER_ERROR: "サーバーエラーが発生しました。",
  PERMISSION_DENIED: "操作権限がありません。",
  ALREADY_UPDATED: "他の操作で状態が更新されました。再読み込みしてください。",
};

export interface ToggleArgs {
  reservationId: ReservationId;
  /** 反転前の状態（true = 済 → 未、false = 未 → 済） */
  currentCheckedIn: boolean;
  /** 失敗時に呼ばれる rollback コールバック（caller の optimistic state を戻す） */
  onRollback: () => void;
}

export interface UseReservationCheckin {
  /** in-flight Set: ガード判定 / `aria-busy` 表示用 */
  inFlight: Set<string>;
  /** in-flight 判定（reservationId）。reactive set 経由 */
  isInFlight: (reservationId: ReservationId) => boolean;
  /** トグル実行（in-flight 中なら no-op で返る） */
  toggle: (args: ToggleArgs) => Promise<void>;
}

export function useReservationCheckin(): UseReservationCheckin {
  // reactive() で Set をラップ → has() の参照変化を Vue が追跡できる
  const inFlight = reactive(new Set<string>());
  const { toast } = useToast();

  function isInFlight(reservationId: ReservationId): boolean {
    return inFlight.has(reservationId as unknown as string);
  }

  async function toggle(args: ToggleArgs): Promise<void> {
    const idStr = args.reservationId as unknown as string;
    if (inFlight.has(idStr)) {
      // 二重発火ガード: 既に進行中の mutation がある
      return;
    }
    inFlight.add(idStr);

    try {
      const result = await toggleCheckin(
        args.reservationId,
        args.currentCheckedIn,
      );
      if (!result.ok) {
        // 失敗 → caller の optimistic state を戻す
        args.onRollback();
        toast({
          title: "チェックイン更新に失敗しました",
          description: ERROR_MESSAGES[result.error.code] ?? result.error.message,
          variant: "destructive",
        });
      }
    } finally {
      inFlight.delete(idStr);
    }
  }

  return { inFlight, isInFlight, toggle };
}
