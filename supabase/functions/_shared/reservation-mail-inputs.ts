// DB 行 (reservations / events / venues) からメール文面レンダラの入力構造へ変換する純粋関数群。
//
// Edge Function 本体 (Deno.serve handler) は SELECT で得た raw row を渡し、
// 本ファイルの関数が ReservationConfirmedInput / ReservationCancelledInput を組み立てる。
// 純粋関数として独立しているため Vitest (node) で単体検証できる。
//
// 予約番号フォーマットと JST 日時整形のロジックは apps/reservation 側 entity と
// 同一でなければならない。本ファイル内で再実装している箇所は以下と完全同一の挙動を保つ:
//   - 予約番号: apps/reservation/src/entities/reservation/lib/format-reservation-number.ts
// 将来 monorepo 共有 package に切り出した際は両方から import する形に統合する。

import type {
  ReservationCancelledInput,
  ReservationConfirmedInput,
} from "./mailer-templates.ts";

export type ReservationRow = {
  id: string; // UUID
  guest_count: number;
  note: string | null;
  cancelled_at: string | null; // ISO timestamptz
};

export type EventRow = {
  id: string;
  name: string;
  start_at: string; // ISO timestamptz
  end_at: string; // ISO timestamptz
  fee: number | null;
  email_note: string | null; // イベント固有のメール追記メッセージ (空は非掲載)
};

export type VenueRow = {
  name: string;
  address: string | null;
  access_note: string | null; // 会場固有の案内 (集合場所・アクセス・注意事項。空は非掲載)
  default_fee: number | null;
};

export type BuildUrls = {
  reservationDetailUrl: string;
  eventDetailUrl: string;
  lineOpenChatUrl: string;
};

// `apps/reservation/src/entities/reservation/lib/format-reservation-number.ts`
// と完全同一の Crockford Base32 (I / L / O / U を除いた 32 文字) アルファベット。
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function formatReservationDisplayId(id: string): string {
  const hex = id.replace(/-/g, "").toLowerCase();

  let bits = 0n;
  for (let i = 0; i < 10; i++) {
    const nibble = parseInt(hex[i] ?? "0", 16);
    bits = (bits << 4n) | BigInt(Number.isNaN(nibble) ? 0 : nibble);
  }

  let encoded = "";
  for (let i = 0; i < 8; i++) {
    const shift = BigInt((7 - i) * 5);
    const idx = Number((bits >> shift) & 0x1fn);
    encoded += ALPHABET[idx];
  }

  return `#HQ-${encoded.slice(0, 4)}-${encoded.slice(4, 8)}`;
}

const JST_RANGE_DATE_PART: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
};

const JST_TIME_PART: Intl.DateTimeFormatOptions = {
  timeZone: "Asia/Tokyo",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

export function formatJstRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const datePart = new Intl.DateTimeFormat("ja-JP", JST_RANGE_DATE_PART).format(
    start,
  );
  const startTime = new Intl.DateTimeFormat("ja-JP", JST_TIME_PART).format(
    start,
  );
  const endTime = new Intl.DateTimeFormat("ja-JP", JST_TIME_PART).format(end);
  return `${datePart} ${startTime}〜${endTime}`;
}

export function formatJstDateTime(iso: string): string {
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat("ja-JP", JST_RANGE_DATE_PART).format(
    d,
  );
  const timePart = new Intl.DateTimeFormat("ja-JP", JST_TIME_PART).format(d);
  return `${datePart} ${timePart}`;
}

const DEFAULT_SUPPORT_NOTE =
  "メールが届かない場合は迷惑メールフォルダもご確認ください。";

export function buildConfirmedInput(
  reservation: ReservationRow,
  event: EventRow,
  venue: VenueRow,
  urls: BuildUrls,
): ReservationConfirmedInput {
  // event.fee NULL は会場 default_fee を継承 (data-schema spec)
  const feePerPerson = event.fee ?? venue.default_fee ?? 0;
  return {
    reservationDisplayId: formatReservationDisplayId(reservation.id),
    eventName: event.name,
    startAtJst: formatJstRange(event.start_at, event.end_at),
    venueName: venue.name,
    venueAddress: venue.address ?? "",
    venueAccessNote: venue.access_note,
    feePerPerson,
    guestCount: reservation.guest_count,
    note: reservation.note,
    eventEmailNote: event.email_note,
    lineOpenChatUrl: urls.lineOpenChatUrl,
    reservationDetailUrl: urls.reservationDetailUrl,
    supportNote: DEFAULT_SUPPORT_NOTE,
  };
}

export function buildCancelledInput(
  reservation: ReservationRow,
  event: EventRow,
  venue: VenueRow,
  urls: BuildUrls,
): ReservationCancelledInput {
  if (!reservation.cancelled_at) {
    // 呼び出し側 (Edge Function ハンドラ) で status='cancelled' 行のみ通すため通常は到達しないが、
    // 型システムで NULL 可能性を握っているため防御的に現在時刻にフォールバックする
    throw new Error(
      "buildCancelledInput: reservation.cancelled_at is null (expected status='cancelled' row)",
    );
  }
  return {
    reservationDisplayId: formatReservationDisplayId(reservation.id),
    eventName: event.name,
    startAtJst: formatJstRange(event.start_at, event.end_at),
    venueName: venue.name,
    cancelledAtJst: formatJstDateTime(reservation.cancelled_at),
    eventDetailUrl: urls.eventDetailUrl,
    lineOpenChatUrl: urls.lineOpenChatUrl,
  };
}
