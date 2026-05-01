import { type Result, ok, err } from "@high-q/shared";
import type { ReservationId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";

/**
 * reservations への mutation API layer。
 *
 * - toggleCheckin: status + checked_in_at を WHERE 句条件付きで同時 UPDATE
 *   多重 UPDATE 防御（D3）
 * - cancelByAdmin: status='cancelled' UPDATE。cancelled_at は既存トリガーで自動設定
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D3, D4)
 */

export type MutationErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED"
  | "ALREADY_UPDATED";

export interface MutationError {
  code: MutationErrorCode;
  message: string;
}

function classifyError(error: { code?: string; message: string }): MutationErrorCode {
  if (error.code === "42501" || /permission/i.test(error.message)) {
    return "PERMISSION_DENIED";
  }
  return "SERVER_ERROR";
}

/**
 * チェックイン状態をトグル。
 *
 * - `currentCheckedIn = false` → 未→済: status='attended', checked_in_at=now()
 *   WHERE: status='reserved' AND checked_in_at IS NULL（多重 UPDATE 防御）
 * - `currentCheckedIn = true` → 済→未: status='reserved', checked_in_at=null
 *   WHERE: status='attended'
 *
 * WHERE 句条件不一致で 0 行更新となった場合は `ALREADY_UPDATED`（他タブ操作 / 状態不整合）
 */
export async function toggleCheckin(
  reservationId: ReservationId,
  currentCheckedIn: boolean,
): Promise<Result<void, MutationError>> {
  const supabase = getSupabase();
  const idStr = reservationId as unknown as string;

  try {
    const builder = supabase
      .from("reservations")
      .update(
        currentCheckedIn
          ? { status: "reserved", checked_in_at: null }
          : { status: "attended", checked_in_at: new Date().toISOString() },
      )
      .eq("id", idStr);

    const filteredBuilder = currentCheckedIn
      ? builder.eq("status", "attended")
      : builder.eq("status", "reserved").is("checked_in_at", null);

    const { error, data } = await filteredBuilder.select("id");

    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }

    if (!data || data.length === 0) {
      return err({
        code: "ALREADY_UPDATED",
        message: `reservation ${reservationId} was already in target state`,
      });
    }

    return ok(undefined);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

/**
 * admin による予約キャンセル代行。
 *
 * status='cancelled' で UPDATE。cancelled_at はトリガー `set_reservations_cancelled_at`
 * が自動設定する。
 */
export async function cancelByAdmin(
  reservationId: ReservationId,
): Promise<Result<void, MutationError>> {
  const supabase = getSupabase();
  const idStr = reservationId as unknown as string;

  try {
    const { error } = await supabase
      .from("reservations")
      .update({ status: "cancelled" })
      .eq("id", idStr);

    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }

    return ok(undefined);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}
