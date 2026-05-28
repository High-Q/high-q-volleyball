import { getSupabase } from "./supabase";

/**
 * 本人確認書類 pending 通知 Edge Function を fire-and-forget で呼ぶ。
 *
 * Issue #284: identity_documents が pending で新規 INSERT された直後に
 *             オーナー宛通知メールを送信する。
 *
 * 設計:
 *   - 呼び出し失敗 (ネットワーク / Edge Function 内のエラー / セッション欠落) は
 *     すべて握りつぶし、呼び出し側の upload 成立フローを妨げない
 *   - 呼び出し側は `void triggerIdentityDocumentPendingNotification(id)` で発火し、
 *     await せずに即座に UI 遷移を継続する想定
 *
 * 関連:
 *   - openspec/changes/notify-identity-document-pending/design.md
 *   - supabase/functions/send-identity-document-pending-notification/index.ts
 */
export async function triggerIdentityDocumentPendingNotification(
  identityDocumentId: string,
): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      console.warn(
        `[identity-document-pending-notification] no session; skipping identityDocumentId=${identityDocumentId}`,
      );
      return;
    }
    const { data, error } = await supabase.functions.invoke(
      "send-identity-document-pending-notification",
      {
        body: { identityDocumentId },
      },
    );
    if (error) {
      console.warn(
        `[identity-document-pending-notification] invoke failed (ignored) identityDocumentId=${identityDocumentId}`,
        error,
      );
      return;
    }
    const payload = data as { ok?: boolean; error?: string } | null;
    if (payload && payload.ok === false) {
      console.warn(
        `[identity-document-pending-notification] edge function reported failure identityDocumentId=${identityDocumentId} error=${payload.error}`,
      );
    }
  } catch (err) {
    console.warn(
      `[identity-document-pending-notification] threw (ignored) identityDocumentId=${identityDocumentId}`,
      err,
    );
  }
}
