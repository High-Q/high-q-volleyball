import { getSupabase } from "./supabase";

/**
 * イベント削除時のキャンセル通知メール送信 Edge Function を fire-and-forget で呼ぶ。
 *
 * - 呼び出し失敗（ネットワーク / Edge Function 内のエラー / セッション欠落）は
 *   すべて握りつぶし、呼び出し側の DELETE 成立 + Toast / redirect を妨げない
 * - 受信者は `snapshotRecipients` に CASCADE 削除前のスナップショットを渡す MUST
 *
 * 関連:
 *   - openspec/changes/notify-event-cancellation-on-delete/design.md
 *   - supabase/functions/send-event-cancellation-notification/index.ts
 */

export interface EventCancellationRecipientInput {
  memberId: string;
  email: string;
}

export interface TriggerEventCancellationNotificationInput {
  eventId: string;
  eventName: string;
  startAtJst: string;
  venueName: string;
  snapshotRecipients: EventCancellationRecipientInput[];
  organizerMessage?: string;
}

export async function triggerEventCancellationNotification(
  input: TriggerEventCancellationNotificationInput,
): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      console.warn(
        `[event-cancellation-notification] no session; skipping eventId=${input.eventId}`,
      );
      return;
    }
    const { data, error } = await supabase.functions.invoke(
      "send-event-cancellation-notification",
      {
        body: {
          eventId: input.eventId,
          eventName: input.eventName,
          startAtJst: input.startAtJst,
          venueName: input.venueName,
          snapshotRecipients: input.snapshotRecipients,
          ...(input.organizerMessage !== undefined
            ? { organizerMessage: input.organizerMessage }
            : {}),
        },
      },
    );
    if (error) {
      console.warn(
        `[event-cancellation-notification] invoke failed (ignored) eventId=${input.eventId}`,
        error,
      );
      return;
    }
    const payload = data as
      | { ok?: boolean; error?: string; sent?: number; failed?: number }
      | null;
    if (payload && payload.ok === false) {
      console.warn(
        `[event-cancellation-notification] edge function reported failure eventId=${input.eventId} error=${payload.error}`,
      );
    } else if (payload && typeof payload.failed === "number" && payload.failed > 0) {
      console.warn(
        `[event-cancellation-notification] partial failure eventId=${input.eventId} sent=${payload.sent} failed=${payload.failed}`,
      );
    }
  } catch (err) {
    console.warn(
      `[event-cancellation-notification] threw (ignored) eventId=${input.eventId}`,
      err,
    );
  }
}
