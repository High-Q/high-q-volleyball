// =============================================================================
// Edge Function: promote-waitlist
// =============================================================================
// Issue #154: 予約キャンセルで枠が空いたとき、当該イベントのキャンセル待ちから
//   待機者を自動で `reserved` に繰り上げ、繰り上げ通知メールを送る。
//
// フロー:
//   1. 会員サイト / 管理画面のキャンセル成功後に `{ eventId }` で fire-and-forget 起動
//   2. Authorization JWT で認証のみ確認 (authenticated 限定。本人検証は不要 = system 起点)
//   3. service_role で event(capacity, 文面用情報) / availability(booked) / waitlist を取得
//   4. selectPromotions (空きを埋め切る走査) で昇格対象を決定
//   5. 対象を `status='reserved'` に UPDATE (status='waitlist' の行のみ。並行昇格に安全)
//   6. 昇格した各会員へ繰り上げ通知メールを送信 (失敗は握りつぶしログ。他を妨げない)
//   7. `{ ok, promotedCount }` を返す (失敗系も 200 + 構造化 body)
//
// 関連:
//   openspec/changes/reservation-waitlist-promotion/specs/reservation-waitlist-promotion/spec.md
//   openspec/changes/reservation-waitlist-promotion/design.md
// =============================================================================

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  selectPromotions,
  type WaitlistEntry,
} from "../_shared/waitlist-promotion.ts";
import { buildConfirmedInput, type BuildUrls } from "../_shared/reservation-mail-inputs.ts";
import { renderReservationPromotedMail } from "../_shared/mailer-templates.ts";
import { loadMailEnv, sendMail } from "../_shared/mailer.ts";

// apps/reservation/src/shared/lib/contact-channels.ts と完全同一の URL に保つ MUST。
const LINE_OPEN_CHAT_URL =
  "https://line.me/ti/g2/f6YscOz1mh7dnUWX_T4fG3mlqzppz7EoC6-k9A?utm_source=invitation&utm_medium=link_copy&utm_campaign=default";

function getBaseUrl(): string {
  return (
    Deno.env.get("RESERVATION_BASE_URL") ??
    "https://high-q-reservation.onrender.com"
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type JoinedVenue = {
  name: string;
  address: string | null;
  access_note: string | null;
  default_fee: number | null;
};

type JoinedEvent = {
  id: string;
  name: string;
  start_at: string;
  end_at: string;
  fee: number | null;
  capacity: number | null;
  email_note: string | null;
  venues: JoinedVenue | null;
};

type WaitlistRow = {
  id: string;
  member_id: string;
  guest_count: number;
  note: string | null;
  created_at: string;
};

export async function handlePromoteWaitlist(req: Request): Promise<Response> {
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
  const eventId =
    bodyRaw && typeof bodyRaw === "object"
      ? (bodyRaw as { eventId?: unknown }).eventId
      : undefined;
  if (typeof eventId !== "string" || !UUID_RE.test(eventId)) {
    return jsonResponse(
      { error: "validation-error", fieldErrors: { eventId: "invalid" } },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // 認証確認のみ (system 起点のため本人検証はしない。認証済みなら誰でも起動可。
  // 昇格は空き容量に収まる待機者のみのため、不正連打しても過剰昇格しない)
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return jsonResponse({ error: "unauthorized" }, { status: 401 });
  }

  // event + venue + capacity を取得
  const { data: eventRaw, error: eventErr } = await supabase
    .from("events")
    .select(
      `
        id, name, start_at, end_at, fee, capacity, email_note,
        venues:venue_id ( name, address, access_note, default_fee )
      `,
    )
    .eq("id", eventId)
    .maybeSingle();
  if (eventErr) {
    console.error(`[promote-waitlist] event SELECT failed eventId=${eventId}`, eventErr);
    return jsonResponse({ ok: false, error: "internal" }, { status: 200 });
  }
  const event = eventRaw as JoinedEvent | null;
  if (!event || event.capacity === null) {
    // capacity NULL は満員概念が無く繰り上げ対象外。イベント無しも no-op。
    return jsonResponse({ ok: true, promotedCount: 0 }, { status: 200 });
  }

  // 現在の予約埋まり具合 (本人 + 同伴 = sum(1 + guest_count)、reserved + attended) を
  // reservations から直接集計する (集計 view の service_role GRANT 依存を避ける)。
  const { data: bookedRows, error: bookedErr } = await supabase
    .from("reservations")
    .select("guest_count")
    .eq("event_id", eventId)
    .in("status", ["reserved", "attended"]);
  if (bookedErr) {
    console.error(`[promote-waitlist] booked SELECT failed eventId=${eventId}`, bookedErr);
    return jsonResponse({ ok: false, error: "internal" }, { status: 200 });
  }
  const booked = ((bookedRows ?? []) as { guest_count: number }[]).reduce(
    (sum, r) => sum + 1 + r.guest_count,
    0,
  );

  // waitlist を created_at ASC で取得
  const { data: waitlistRaw, error: wlErr } = await supabase
    .from("reservations")
    .select("id, member_id, guest_count, note, created_at")
    .eq("event_id", eventId)
    .eq("status", "waitlist")
    .order("created_at", { ascending: true });
  if (wlErr) {
    console.error(`[promote-waitlist] waitlist SELECT failed eventId=${eventId}`, wlErr);
    return jsonResponse({ ok: false, error: "internal" }, { status: 200 });
  }
  const waitlistRows = (waitlistRaw ?? []) as WaitlistRow[];

  const entries: WaitlistEntry[] = waitlistRows.map((r) => ({
    reservationId: r.id,
    memberId: r.member_id,
    guestCount: r.guest_count,
    createdAt: r.created_at,
  }));

  const selected = selectPromotions({
    capacity: event.capacity,
    booked,
    waitlist: entries,
  });
  if (selected.length === 0) {
    return jsonResponse({ ok: true, promotedCount: 0 }, { status: 200 });
  }

  const venue = event.venues;
  const mailEnv = (() => {
    try {
      return loadMailEnv();
    } catch (err) {
      console.error("[promote-waitlist] loadMailEnv failed", err);
      return null;
    }
  })();
  const rowById = new Map(waitlistRows.map((r) => [r.id, r]));

  let promotedCount = 0;
  for (const sel of selected) {
    // 昇格 UPDATE。status='waitlist' の行のみ (並行昇格で既に reserved 化されていれば 0 行)
    const { data: updated, error: updErr } = await supabase
      .from("reservations")
      .update({ status: "reserved" })
      .eq("id", sel.reservationId)
      .eq("status", "waitlist")
      .select("id");
    if (updErr) {
      console.error(
        `[promote-waitlist] promote UPDATE failed reservationId=${sel.reservationId}`,
        updErr,
      );
      continue;
    }
    if (!updated || updated.length === 0) {
      // 既に昇格済み等 (no-op)。メールも送らない。
      continue;
    }
    promotedCount += 1;

    // 繰り上げ通知メール (失敗は握りつぶし、他の昇格/送信を妨げない)
    try {
      if (mailEnv === null || venue === null) {
        console.error(
          `[promote-waitlist] mail skipped (no mailEnv/venue) reservationId=${sel.reservationId}`,
        );
        continue;
      }
      const row = rowById.get(sel.reservationId);
      const { data: memberRow, error: memberErr } = await supabase
        .from("members")
        .select("email")
        .eq("id", sel.memberId)
        .maybeSingle();
      if (memberErr || !(memberRow as { email?: string } | null)?.email) {
        console.error(
          `[promote-waitlist] member email lookup failed reservationId=${sel.reservationId} memberId=${sel.memberId}`,
          memberErr,
        );
        continue;
      }
      const urls: BuildUrls = {
        reservationDetailUrl: `${getBaseUrl()}/reservations/${sel.reservationId}`,
        eventDetailUrl: `${getBaseUrl()}/events/${event.id}`,
        lineOpenChatUrl: LINE_OPEN_CHAT_URL,
      };
      const input = buildConfirmedInput(
        {
          id: sel.reservationId,
          guest_count: row?.guest_count ?? sel.guestCount,
          note: row?.note ?? null,
          cancelled_at: null,
        },
        {
          id: event.id,
          name: event.name,
          start_at: event.start_at,
          end_at: event.end_at,
          fee: event.fee,
          email_note: event.email_note,
        },
        venue,
        urls,
      );
      const { subject, body } = renderReservationPromotedMail(input);
      await sendMail(
        mailEnv,
        (memberRow as { email: string }).email,
        subject,
        body,
      );
      console.log(
        `[promote-waitlist] promoted + mailed reservationId=${sel.reservationId} memberId=${sel.memberId}`,
      );
    } catch (err) {
      console.error(
        `[promote-waitlist] mail failed (promotion kept) reservationId=${sel.reservationId}`,
        err,
      );
    }
  }

  return jsonResponse({ ok: true, promotedCount }, { status: 200 });
}

Deno.serve(handlePromoteWaitlist);
