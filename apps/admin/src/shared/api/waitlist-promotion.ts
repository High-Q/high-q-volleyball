import { getSupabase } from "./supabase";

/**
 * キャンセル待ちの繰り上げ Edge Function (`promote-waitlist`) を fire-and-forget で叩く。
 *
 * - admin のキャンセル代行で枠が空いた直後に、当該 event_id で起動する。
 * - 呼び出し失敗（ネットワーク / Edge Function 内エラー / セッション欠落）はすべて
 *   握りつぶし、呼び出し側のキャンセル成立を妨げない。
 * - 昇格は Edge Function 側で「現在の空きに収まる待機者のみ」に限定されるため冪等。
 *
 * 関連:
 *   - openspec/changes/reservation-waitlist-promotion/specs/reservation-waitlist-promotion/spec.md
 *   - supabase/functions/promote-waitlist/index.ts
 */
export async function triggerWaitlistPromotion(eventId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      console.warn(
        `[waitlist-promotion] no session; skipping eventId=${eventId}`,
      );
      return;
    }
    const { error } = await supabase.functions.invoke("promote-waitlist", {
      body: { eventId },
    });
    if (error) {
      console.warn(
        `[waitlist-promotion] invoke failed (ignored) eventId=${eventId}`,
        error,
      );
    }
  } catch (err) {
    console.warn(`[waitlist-promotion] threw (ignored) eventId=${eventId}`, err);
  }
}
