import { getSupabase } from "./supabase";

/**
 * 予約完了 / キャンセル通知メール送信 Edge Function を fire-and-forget で呼ぶ。
 *
 * - 呼び出し失敗（ネットワーク / Edge Function 内のエラー / セッション欠落）は
 *   すべて握りつぶし、呼び出し側の予約成立フローを妨げない
 * - 呼び出し側は `void triggerReservationNotification(id, type)` で発火し、
 *   await せずに即座に UI 遷移を継続する想定
 *
 * 関連:
 *   - openspec/changes/reservation-completion-email/design.md Decision 1 / 3
 *   - supabase/functions/send-reservation-notification/index.ts
 */
export async function triggerReservationNotification(
  reservationId: string,
  eventType: "confirmed" | "cancelled",
): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      console.warn(
        `[reservation-notification] no session; skipping eventType=${eventType} reservationId=${reservationId}`,
      );
      return;
    }
    const { data, error } = await supabase.functions.invoke(
      "send-reservation-notification",
      {
        body: { reservationId, eventType },
      },
    );
    if (error) {
      console.warn(
        `[reservation-notification] invoke failed (ignored) eventType=${eventType} reservationId=${reservationId}`,
        error,
      );
      return;
    }
    // Edge Function はメール送信失敗時も 200 + { ok: false, error } を返すので info ログに残す
    const payload = data as { ok?: boolean; error?: string } | null;
    if (payload && payload.ok === false) {
      console.warn(
        `[reservation-notification] edge function reported failure eventType=${eventType} reservationId=${reservationId} error=${payload.error}`,
      );
    }
  } catch (err) {
    console.warn(
      `[reservation-notification] threw (ignored) eventType=${eventType} reservationId=${reservationId}`,
      err,
    );
  }
}
