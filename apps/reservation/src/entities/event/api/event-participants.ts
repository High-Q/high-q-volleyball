import { unsafeMemberId } from "@high-q/shared";
import type { EventId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type { EventParticipantNickname } from "../model/event.types";

type EventParticipantRow = {
  member_id: string;
  nickname: string | null;
  is_self: boolean;
  guest_count: number;
};

/**
 * 予約済イベントの参加者ニックネーム一覧を取得する (Issue #278)。
 *
 * - Supabase RPC `public.get_event_participant_nicknames(p_event_id uuid)` を呼ぶ
 *   (SECURITY DEFINER + authenticated にのみ EXECUTE 許可)。
 * - 呼び出し元が当該イベントに有効な予約 (`status IN ('reserved','attended')`) を
 *   持たない場合、関数は例外を投げず空配列を返す (UI は画面全体の 404 状態に吸収)。
 * - 戻り値は `reservations.created_at ASC` の順を保持し、UI 側で並び替えない。
 * - `reservations` / `members` テーブルを直接 SELECT せず、すべて本 RPC 経由とする
 *   (RLS 二重防衛 + 個人特定情報の流出経路を最小化)。
 */
export async function fetchEventParticipantNicknames(
  eventId: EventId,
): Promise<EventParticipantNickname[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_event_participant_nicknames", {
    p_event_id: eventId,
  });
  if (error) {
    throw error;
  }
  const rows: EventParticipantRow[] = (data ?? []) as EventParticipantRow[];
  return rows.map((row) => ({
    memberId: unsafeMemberId(row.member_id),
    nickname: row.nickname,
    isSelf: row.is_self,
    guestCount: row.guest_count,
  }));
}
