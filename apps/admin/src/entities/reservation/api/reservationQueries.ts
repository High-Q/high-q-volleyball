import { type Result, ok, err } from "@high-q/shared";
import type { EventId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type { ParticipantRow } from "../model/reservation.types";

/**
 * `event_participants_view` を fetch する API layer。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D1)
 */

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED";

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}

function classifyError(error: { code?: string; message: string }): FetchErrorCode {
  if (error.code === "42501" || /permission/i.test(error.message)) {
    return "PERMISSION_DENIED";
  }
  return "SERVER_ERROR";
}

/**
 * 1 イベントの全参加者（status NOT IN ('cancelled')）を view 経由で取得。
 *
 * created_at 昇順（予約順）で返す。クライアント側の filter / sort はこの上に載る。
 */
export async function getEventParticipants(
  eventId: EventId,
): Promise<Result<ParticipantRow[], FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("event_participants_view")
      .select("*")
      .eq("event_id", eventId as unknown as string)
      .order("created_at", { ascending: true });

    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }

    return ok((data ?? []) as ParticipantRow[]);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}
