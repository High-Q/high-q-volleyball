import { type Result, ok, err } from "@high-q/shared";
import type { EventId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type { EventDetailRow } from "../model/eventDetail.types";

/**
 * `event_detail_view` を fetch する API layer。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D1, D7)
 */

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED"
  | "EVENT_NOT_FOUND";

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
 * event_detail_view を id で SELECT。
 *
 * - 0 行 → `EVENT_NOT_FOUND`（D7: 削除済み or RLS で見えない）
 * - RLS 拒否 → `PERMISSION_DENIED`
 * - ネットワーク → `NETWORK_ERROR`
 */
export async function getEventDetail(
  id: EventId,
): Promise<Result<EventDetailRow, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("event_detail_view")
      .select("*")
      .eq("id", id as unknown as string)
      .maybeSingle();

    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }

    if (data === null) {
      return err({
        code: "EVENT_NOT_FOUND",
        message: `event ${id} not found`,
      });
    }

    return ok(data as EventDetailRow);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}
