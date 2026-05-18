// =============================================================================
// Edge Function: send-reservation-notification
// =============================================================================
// Issue #248: 予約完了 / 予約キャンセル時の通知メールを会員へ送信する。
// Issue #251: 予約内容変更 (edit) 時の通知メールを `eventType='updated'` で追加。
//
// フロー:
//   1. クライアント (apps/reservation) から `{ reservationId, eventType }` を受け取る
//      eventType: 'confirmed' | 'cancelled' | 'updated'
//   2. Authorization ヘッダーの JWT で auth.uid() を確定
//   3. reservations を service_role で SELECT、`member_id === auth.uid()` を自前で検証
//   4. JOIN で event / venue を取得し、members.email を別 SELECT で取得
//   5. eventType ごとに ReservationConfirmedInput / ReservationCancelledInput を組み立て
//      ('updated' は ReservationConfirmedInput を流用し、文言だけ renderReservationUpdatedMail で差し替える)
//   6. renderXxxMail でテキスト本文を生成、sendMail で Gmail SMTP 経由送信
//   7. 成功・失敗をログに残し、UI 側はエラーを描画しない方針のため失敗時も 200 で
//      `{ ok: false, error }` を返す (例外は HTTP 500 ではなく構造化 body で表現)
//
// 関連:
//   - openspec/changes/reservation-completion-email/design.md (Decisions 1〜5)
//   - openspec/changes/reservation-completion-email/specs/reservation-notification-email/spec.md
// =============================================================================

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { validateReservationNotificationPayload } from "../_shared/validation.ts";
import {
  buildCancelledInput,
  buildConfirmedInput,
  type BuildUrls,
} from "../_shared/reservation-mail-inputs.ts";
import {
  renderReservationCancelledMail,
  renderReservationConfirmedMail,
  renderReservationUpdatedMail,
} from "../_shared/mailer-templates.ts";
import { loadMailEnv, sendMail } from "../_shared/mailer.ts";

// apps/reservation/src/shared/lib/contact-channels.ts と完全同一の URL に保つ MUST。
// Edge Function には Vue モジュールを import できないため定数を二重に保持する。
const LINE_OPEN_CHAT_URL =
  "https://line.me/ti/g2/f6YscOz1mh7dnUWX_T4fG3mlqzppz7EoC6-k9A?utm_source=invitation&utm_medium=link_copy&utm_campaign=default";

function getBaseUrl(): string {
  return (
    Deno.env.get("RESERVATION_BASE_URL") ??
    "https://high-q-reservation.onrender.com"
  );
}

type JoinedVenue = {
  name: string;
  address: string | null;
  meeting_point: string | null;
  map_url: string | null;
  default_fee: number | null;
};

type JoinedEvent = {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  fee: number | null;
  venues: JoinedVenue | null;
};

type JoinedReservation = {
  id: string;
  guest_count: number;
  note: string | null;
  cancelled_at: string | null;
  member_id: string;
  events: JoinedEvent | null;
};

export async function handleSendReservationNotification(
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

  const validation = validateReservationNotificationPayload(bodyRaw);
  if (!validation.ok) {
    return jsonResponse(
      { error: "validation-error", fieldErrors: validation.errors },
      { status: 400 },
    );
  }
  const { reservationId, eventType } = validation.payload;

  const supabase = createServiceClient();

  // auth.uid() 確定
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    console.warn(
      "[send-reservation-notification] unauthorized (getUser failed)",
      userErr,
    );
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }
  const memberId = userData.user.id;

  // reservation + event + venue を JOIN 取得 (service_role bypass + 自前で member_id 一致を検証)
  const { data: rawReservation, error: resErr } = await supabase
    .from("reservations")
    .select(
      `
        id, guest_count, note, cancelled_at, member_id,
        events:event_id (
          id, name, start_at, end_at, fee,
          venues:venue_id ( name, address, meeting_point, map_url, default_fee )
        )
      `,
    )
    .eq("id", reservationId)
    .maybeSingle();
  if (resErr) {
    console.error(
      `[send-reservation-notification] reservation SELECT failed eventType=${eventType} reservationId=${reservationId}`,
      resErr,
    );
    return jsonResponse({ ok: false, error: "internal" }, { status: 200 });
  }
  const reservation = rawReservation as JoinedReservation | null;
  if (!reservation) {
    console.warn(
      `[send-reservation-notification] reservation not found eventType=${eventType} reservationId=${reservationId}`,
    );
    return jsonResponse({ ok: false, error: "not-found" }, { status: 200 });
  }

  // member_id 改ざんガード
  if (reservation.member_id !== memberId) {
    console.warn(
      `[send-reservation-notification] member_id mismatch eventType=${eventType} reservationId=${reservationId} requester=${memberId} ownerOfReservation=${reservation.member_id}`,
    );
    return jsonResponse({ error: "forbidden" }, { status: 403 });
  }

  const event = reservation.events;
  const venue = event?.venues ?? null;
  if (!event || !venue) {
    console.error(
      `[send-reservation-notification] joined event/venue missing eventType=${eventType} reservationId=${reservationId}`,
    );
    return jsonResponse({ ok: false, error: "internal" }, { status: 200 });
  }

  // 送信先メールアドレスは members.email から取得
  const { data: memberRow, error: memberErr } = await supabase
    .from("members")
    .select("email")
    .eq("id", memberId)
    .maybeSingle();
  if (memberErr || !memberRow?.email) {
    console.error(
      `[send-reservation-notification] member email lookup failed eventType=${eventType} reservationId=${reservationId} memberId=${memberId}`,
      memberErr,
    );
    return jsonResponse({ ok: false, error: "no-email" }, { status: 200 });
  }

  const baseUrl = getBaseUrl();
  const urls: BuildUrls = {
    reservationDetailUrl: `${baseUrl}/reservations/${reservation.id}`,
    eventDetailUrl: `${baseUrl}/events/${event.id}`,
    lineOpenChatUrl: LINE_OPEN_CHAT_URL,
  };

  let subject: string;
  let body: string;
  try {
    if (eventType === "confirmed" || eventType === "updated") {
      const input = buildConfirmedInput(
        {
          id: reservation.id,
          guest_count: reservation.guest_count,
          note: reservation.note,
          cancelled_at: reservation.cancelled_at,
        },
        {
          id: event.id,
          name: event.name,
          start_at: event.start_at,
          end_at: event.end_at,
          fee: event.fee,
        },
        venue,
        urls,
      );
      const rendered =
        eventType === "updated"
          ? renderReservationUpdatedMail(input)
          : renderReservationConfirmedMail(input);
      subject = rendered.subject;
      body = rendered.body;
    } else {
      const input = buildCancelledInput(
        {
          id: reservation.id,
          guest_count: reservation.guest_count,
          note: reservation.note,
          cancelled_at: reservation.cancelled_at,
        },
        {
          id: event.id,
          name: event.name,
          start_at: event.start_at,
          end_at: event.end_at,
          fee: event.fee,
        },
        venue,
        urls,
      );
      const rendered = renderReservationCancelledMail(input);
      subject = rendered.subject;
      body = rendered.body;
    }
  } catch (err) {
    console.error(
      `[send-reservation-notification] build/render failed eventType=${eventType} reservationId=${reservationId} memberId=${memberId}`,
      err,
    );
    return jsonResponse({ ok: false, error: "build-failed" }, { status: 200 });
  }

  try {
    const mailEnv = loadMailEnv();
    await sendMail(mailEnv, memberRow.email, subject, body);
    console.log(
      `[send-reservation-notification] sent ok eventType=${eventType} reservationId=${reservationId} memberId=${memberId}`,
    );
    return jsonResponse({ ok: true }, { status: 200 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `[send-reservation-notification] sendMail failed eventType=${eventType} reservationId=${reservationId} memberId=${memberId} detail=${detail}`,
    );
    return jsonResponse({ ok: false, error: "mail-failed" }, { status: 200 });
  }
}

Deno.serve(handleSendReservationNotification);
