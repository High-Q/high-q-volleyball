// =============================================================================
// Edge Function: send-identity-document-pending-notification
// =============================================================================
// Issue #284: 会員が本人確認書類をアップロードし `identity_documents.status='pending'`
// が新規 INSERT された直後に、オーナー宛通知メールを送信する。
//
// 動機 (proposal):
//   - 会員は pending 中でも予約可能だが、admin が差し戻し / マスク漏れ削除を行うと
//     当該会員の active 予約が連鎖キャンセルされる (admin-identity-document-review)
//   - pending 放置 → 会員予約 → 後日 reject → 連鎖キャンセル の悪体験を抑制するため、
//     pending 発生即時にオーナーへ通知し reject 判断を会員予約より先に間に合わせる
//
// フロー:
//   1. クライアント (apps/reservation) から `{ identityDocumentId }` を受け取る
//   2. Authorization ヘッダーの JWT で auth.uid() を確定 (401 if missing/invalid)
//   3. identity_documents を service_role で SELECT、`member_id === auth.uid()` を自前検証
//   4. OWNER_NOTIFICATION_EMAIL secret を取得 (未設定なら 200 + skip)
//   5. ADMIN_BASE_URL secret から admin 詳細画面 URL を組み立て
//   6. renderIdentityDocumentPendingNotificationMail で本文生成、sendMail で送信
//   7. 失敗は HTTP 200 + { ok: false, error } で表現 (member_id 改ざんのみ 403)
//
// 関連:
//   - openspec/changes/notify-identity-document-pending/design.md
//   - openspec/changes/notify-identity-document-pending/specs/identity-document-pending-notification-email/spec.md
// =============================================================================

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { validateIdentityDocumentPendingNotificationPayload } from "../_shared/validation.ts";
import { renderIdentityDocumentPendingNotificationMail } from "../_shared/mailer-templates.ts";
import { loadMailEnv, sendMail } from "../_shared/mailer.ts";
import { captureException } from "../_shared/sentry.ts";

const DEFAULT_ADMIN_BASE_URL = "https://high-q-admin.onrender.com";

function getAdminBaseUrl(): string {
  return Deno.env.get("ADMIN_BASE_URL") ?? DEFAULT_ADMIN_BASE_URL;
}

type JoinedMember = {
  display_name: string | null;
};

type JoinedIdentityDocument = {
  id: string;
  member_id: string;
  uploaded_at: string;
  member: JoinedMember | null;
};

export async function handleSendIdentityDocumentPendingNotification(
  req: Request,
): Promise<Response> {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonResponse({ error: "method-not-allowed" }, { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }

  let bodyRaw: unknown;
  try {
    bodyRaw = await req.json();
  } catch {
    return jsonResponse({ error: "invalid-json" }, { status: 400 });
  }

  const validation = validateIdentityDocumentPendingNotificationPayload(bodyRaw);
  if (!validation.ok) {
    return jsonResponse(
      { error: "validation-error", fieldErrors: validation.errors },
      { status: 400 },
    );
  }
  const { identityDocumentId } = validation.payload;

  const supabase = createServiceClient();

  // auth.uid() 確定
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    console.warn(
      "[send-identity-document-pending-notification] unauthorized (getUser failed)",
      userErr,
    );
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }
  const memberId = userData.user.id;

  // identity_document + member.display_name を JOIN 取得 (service_role bypass)
  // FK が member_id / reviewed_by の 2 本あるため PostgREST embed の曖昧性回避に
  // `!identity_documents_member_id_fkey` を明示する MUST (admin 側 query 群と同パターン)
  const { data: rawDoc, error: docErr } = await supabase
    .from("identity_documents")
    .select(
      "id, member_id, uploaded_at, member:members!identity_documents_member_id_fkey(display_name)",
    )
    .eq("id", identityDocumentId)
    .maybeSingle();
  if (docErr) {
    console.error(
      `[send-identity-document-pending-notification] identity_documents SELECT failed identityDocumentId=${identityDocumentId}`,
      docErr,
    );
    return jsonResponse({ ok: false, error: "internal" }, { status: 200 });
  }
  const doc = rawDoc as JoinedIdentityDocument | null;
  if (!doc) {
    console.warn(
      `[send-identity-document-pending-notification] identity_document not found identityDocumentId=${identityDocumentId}`,
    );
    return jsonResponse({ ok: false, error: "not-found" }, { status: 200 });
  }

  // member_id 改ざんガード (本人の書類のみ通知 trigger 可能)
  if (doc.member_id !== memberId) {
    console.warn(
      `[send-identity-document-pending-notification] member_id mismatch identityDocumentId=${identityDocumentId} requester=${memberId} ownerOfDocument=${doc.member_id}`,
    );
    return jsonResponse({ error: "forbidden" }, { status: 403 });
  }

  const ownerEmail = Deno.env.get("OWNER_NOTIFICATION_EMAIL")?.trim() ?? "";
  if (!ownerEmail) {
    console.warn(
      `[send-identity-document-pending-notification] OWNER_NOTIFICATION_EMAIL 未設定のためスキップ identityDocumentId=${identityDocumentId} memberId=${memberId}`,
    );
    return jsonResponse(
      { ok: false, error: "no-owner-email" },
      { status: 200 },
    );
  }

  const adminBaseUrl = getAdminBaseUrl();
  const detailUrl = `${adminBaseUrl}/identity-documents/${doc.id}`;
  const memberDisplayName = doc.member?.display_name ?? "(display_name 未設定)";

  let subject: string;
  let body: string;
  try {
    const rendered = renderIdentityDocumentPendingNotificationMail({
      memberDisplayName,
      uploadedAtIso: doc.uploaded_at,
      detailUrl,
    });
    subject = rendered.subject;
    body = rendered.body;
  } catch (err) {
    console.error(
      `[send-identity-document-pending-notification] render failed identityDocumentId=${identityDocumentId} memberId=${memberId}`,
      err,
    );
    captureException(err, {
      functionName: "send-identity-document-pending-notification.render",
      extra: { identityDocumentId, memberId },
    });
    return jsonResponse({ ok: false, error: "build-failed" }, { status: 200 });
  }

  try {
    const mailEnv = loadMailEnv();
    await sendMail(mailEnv, ownerEmail, subject, body);
    console.log(
      `[send-identity-document-pending-notification] sent ok kind=identity-document-pending identityDocumentId=${identityDocumentId} memberId=${memberId} ownerEmail=${ownerEmail}`,
    );
    return jsonResponse({ ok: true }, { status: 200 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-identity-document-pending-notification] sendMail failed identityDocumentId=${identityDocumentId} memberId=${memberId} detail=${detail}`,
    );
    return jsonResponse({ ok: false, error: "mail-failed" }, { status: 200 });
  }
}

Deno.serve(handleSendIdentityDocumentPendingNotification);
