/**
 * 予約詳細画面の「カレンダーに追加 (.ics)」用 iCalendar (RFC 5545) ファイル生成。
 *
 * - 単一 VEVENT 構成。VTIMEZONE は持たず DTSTART / DTEND を UTC + Z サフィックス単独で出力
 *   (Apple / Google / Outlook いずれも閲覧者の TZ で表示するため十分)
 * - UID は `reservation-{reservationId}@high-q.example` で安定。再ダウンロード時にカレンダー側で
 *   同一イベントとして上書きされる
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 *     Requirement: カレンダー追加 (.ics ダウンロード)
 */

const PROD_ID = "-//High Q//Reservation//JP";
const UID_DOMAIN = "high-q.example";

export type BuildIcsInput = {
  reservationId: string;
  reservationNumber: string;
  eventName: string;
  startAt: string;
  endAt: string;
  venueName: string;
  venueAddress: string | null;
};

export function buildIcs(input: BuildIcsInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PROD_ID}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:reservation-${input.reservationId}@${UID_DOMAIN}`,
    `DTSTAMP:${formatUtcStamp(new Date().toISOString())}`,
    `DTSTART:${formatUtcStamp(input.startAt)}`,
    `DTEND:${formatUtcStamp(input.endAt)}`,
    `SUMMARY:${escapeIcsText(input.eventName)}`,
    `LOCATION:${escapeIcsText(formatLocation(input.venueName, input.venueAddress))}`,
    `DESCRIPTION:${escapeIcsText(`予約番号 ${input.reservationNumber}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

function formatLocation(name: string, address: string | null): string {
  if (address === null || address.length === 0) {
    return name;
  }
  return `${name} / ${address}`;
}

/** ISO 8601 → `YYYYMMDDTHHMMSSZ` (UTC) */
function formatUtcStamp(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear().toString().padStart(4, "0");
  const mm = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = d.getUTCDate().toString().padStart(2, "0");
  const hh = d.getUTCHours().toString().padStart(2, "0");
  const mi = d.getUTCMinutes().toString().padStart(2, "0");
  const ss = d.getUTCSeconds().toString().padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

/** RFC 5545 のテキストエスケープ: `\` `;` `,` `\n` */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** ファイルダウンロード時のファイル名 (`high-q-{reservationNumber}.ics`) */
export function buildIcsFileName(reservationNumber: string): string {
  const sanitized = reservationNumber.replace(/^#/, "");
  return `high-q-${sanitized}.ics`;
}
