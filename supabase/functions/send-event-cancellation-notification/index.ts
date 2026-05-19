// =============================================================================
// Edge Function: send-event-cancellation-notification
// =============================================================================
// Issue #272: admin がイベント削除を確定したとき、当該イベントに紐づく有効予約者
// 全員へキャンセル通知メールを自動配信する。
//
// フロー:
//   1. クライアント (apps/admin) から
//      { eventId, eventName, startAtJst, venueName, snapshotRecipients, organizerMessage? }
//      を受け取る。snapshotRecipients は admin が削除直前にスナップショットした
//      有効予約者 (memberId / email) の配列
//   2. Authorization ヘッダーの JWT で auth.uid() を確定
//   3. 呼び出し元会員の members.role が 'admin' であることを service_role 経由で確認
//      (admin 以外は 403)
//   4. snapshotRecipients を memberId でユニーク化
//   5. renderEventCancellationMail で件名 / 本文を 1 度だけ組み立て
//   6. 受信者をループ送信。1 件失敗で全体を 5xx にせず、成功 / 失敗件数を構造化ログ
//      に出力する (fire-and-forget 流儀。アプリ層は呼び出し結果を待たない)
//
// 関連:
//   openspec/changes/notify-event-cancellation-on-delete/design.md
//   openspec/changes/notify-event-cancellation-on-delete/specs/event-cancellation-notification-email/spec.md
// =============================================================================

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { validateEventCancellationNotificationPayload } from "../_shared/validation.ts";
import { renderEventCancellationMail } from "../_shared/mailer-templates.ts";
import { loadMailEnv, sendMail } from "../_shared/mailer.ts";

// apps/reservation/src/shared/lib/contact-channels.ts と完全同一の URL に保つ MUST。
// Edge Function には Vue モジュールを import できないため定数を二重に保持する。
const LINE_OPEN_CHAT_URL =
  "https://line.me/ti/g2/f6YscOz1mh7dnUWX_T4fG3mlqzppz7EoC6-k9A?utm_source=invitation&utm_medium=link_copy&utm_campaign=default";

const SUPPORT_NOTE =
  "メールが届かない場合は迷惑メールフォルダもご確認ください。";

function getReservationBaseUrl(): string {
  return (
    Deno.env.get("RESERVATION_BASE_URL") ??
    "https://high-q-reservation.onrender.com"
  );
}

export async function handleSendEventCancellationNotification(
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

  const validation = validateEventCancellationNotificationPayload(bodyRaw);
  if (!validation.ok) {
    return jsonResponse(
      { error: "validation-error", fieldErrors: validation.errors },
      { status: 400 },
    );
  }
  const {
    eventId,
    eventName,
    startAtJst,
    venueName,
    snapshotRecipients,
    organizerMessage,
  } = validation.payload;

  const supabase = createServiceClient();

  // auth.uid() 確定
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    console.warn(
      "[send-event-cancellation-notification] unauthorized (getUser failed)",
      userErr,
    );
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }
  const callerId = userData.user.id;

  // 呼び出し元の members.role を確認 (admin 以外は 403)
  const { data: memberRow, error: memberErr } = await supabase
    .from("members")
    .select("role")
    .eq("id", callerId)
    .maybeSingle();
  if (memberErr) {
    console.error(
      `[send-event-cancellation-notification] member SELECT failed eventId=${eventId} callerId=${callerId}`,
      memberErr,
    );
    return jsonResponse({ ok: false, error: "internal" }, { status: 200 });
  }
  if (!memberRow || memberRow.role !== "admin") {
    console.warn(
      `[send-event-cancellation-notification] forbidden (non-admin) eventId=${eventId} callerId=${callerId} role=${memberRow?.role ?? "null"}`,
    );
    return jsonResponse({ error: "forbidden" }, { status: 403 });
  }

  // memberId をキーに重複排除 (バリデーション側でも実施済だが防御的)
  const dedupRecipients = new Map<string, string>();
  for (const r of snapshotRecipients) {
    if (!dedupRecipients.has(r.memberId)) {
      dedupRecipients.set(r.memberId, r.email);
    }
  }

  let rendered: { subject: string; body: string };
  try {
    rendered = renderEventCancellationMail({
      eventName,
      startAtJst,
      venueName,
      organizerMessage,
      lineOpenChatUrl: LINE_OPEN_CHAT_URL,
      reservationBaseUrl: getReservationBaseUrl(),
      supportNote: SUPPORT_NOTE,
    });
  } catch (err) {
    console.error(
      `[send-event-cancellation-notification] render failed eventId=${eventId} callerId=${callerId}`,
      err,
    );
    return jsonResponse({ ok: false, error: "build-failed" }, { status: 200 });
  }

  let mailEnv;
  try {
    mailEnv = loadMailEnv();
  } catch (err) {
    console.error(
      `[send-event-cancellation-notification] mail env load failed eventId=${eventId} callerId=${callerId}`,
      err,
    );
    return jsonResponse({ ok: false, error: "mail-env" }, { status: 200 });
  }

  let sent = 0;
  let failed = 0;
  for (const [memberId, email] of dedupRecipients) {
    try {
      await sendMail(mailEnv, email, rendered.subject, rendered.body);
      sent += 1;
      console.log(
        `[send-event-cancellation-notification] sent ok eventId=${eventId} memberId=${memberId}`,
      );
    } catch (err) {
      failed += 1;
      const detail = err instanceof Error ? err.message : String(err);
      console.error(
        `[send-event-cancellation-notification] sendMail failed eventId=${eventId} memberId=${memberId} detail=${detail}`,
      );
    }
  }

  console.log(
    `[send-event-cancellation-notification] summary eventId=${eventId} callerId=${callerId} sent=${sent} failed=${failed} total=${dedupRecipients.size}`,
  );

  return jsonResponse(
    { ok: true, sent, failed, total: dedupRecipients.size },
    { status: 200 },
  );
}

Deno.serve(handleSendEventCancellationNotification);
