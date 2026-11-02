/**
 * 告知テンプレートの差し込み項目を展開する (#386)。
 *
 * 差し込み項目は `{日本語名}` 形式。下表に無い `{...}` は本文中の普通の波括弧を
 * 壊さないためにそのまま残す。日時は端末タイムゾーンによらず日本時間で整形する。
 *
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *   「差し込み項目の展開規則」
 */

export interface AnnouncementEventInput {
  name: string;
  vol: number | null;
  /** ISO 8601 */
  startAt: string;
  /** ISO 8601 */
  endAt: string;
  venueName: string | null;
  /** 会場既定額を引き継いだ参加費（円） */
  fee: number | null;
  capacity: number | null;
  /** チャネル別の予約直行リンク */
  bookingLink: string;
  /** 紹介ページ（LP トップ）リンク */
  introLink: string;
}

export interface AnnouncementPlaceholder {
  token: string;
  description: string;
  resolve: (input: AnnouncementEventInput) => string;
}

const TIME_ZONE = "Asia/Tokyo";

const dateParts = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TIME_ZONE,
  month: "numeric",
  day: "numeric",
  weekday: "short",
});

const timeParts = new Intl.DateTimeFormat("ja-JP", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** `11/14(土)` */
function formatDate(iso: string): string {
  const parts = dateParts.formatToParts(new Date(iso));
  return `${part(parts, "month")}/${part(parts, "day")}(${part(parts, "weekday")})`;
}

/** `18:00` */
function formatTime(iso: string): string {
  const parts = timeParts.formatToParts(new Date(iso));
  return `${part(parts, "hour")}:${part(parts, "minute")}`;
}

function formatFee(fee: number | null): string {
  if (fee === null) return "未定";
  if (fee === 0) return "無料";
  return `${fee.toLocaleString("ja-JP")}円`;
}

export const ANNOUNCEMENT_PLACEHOLDERS: ReadonlyArray<AnnouncementPlaceholder> = [
  { token: "{イベント名}", description: "イベント名", resolve: (i) => i.name },
  {
    token: "{回号}",
    description: "vol.42 の形（未設定なら空）",
    resolve: (i) => (i.vol === null ? "" : `vol.${i.vol}`),
  },
  { token: "{日付}", description: "11/14(土) の形", resolve: (i) => formatDate(i.startAt) },
  { token: "{開始時刻}", description: "18:00 の形", resolve: (i) => formatTime(i.startAt) },
  { token: "{終了時刻}", description: "20:00 の形", resolve: (i) => formatTime(i.endAt) },
  { token: "{会場}", description: "会場名", resolve: (i) => i.venueName ?? "" },
  {
    token: "{参加費}",
    description: "1,000円 の形（0 円は無料・未設定は未定）",
    resolve: (i) => formatFee(i.fee),
  },
  {
    token: "{定員}",
    description: "24名 の形（未設定なら空）",
    resolve: (i) => (i.capacity === null ? "" : `${i.capacity}名`),
  },
  {
    token: "{予約リンク}",
    description: "イベントの予約画面へ直行するリンク",
    resolve: (i) => i.bookingLink,
  },
  {
    token: "{紹介ページリンク}",
    description: "サークル紹介ページ（LP）のリンク。初めての人向け",
    resolve: (i) => i.introLink,
  },
];

const KNOWN_TOKENS = new Set(ANNOUNCEMENT_PLACEHOLDERS.map((p) => p.token));

/** 改行・波括弧を含まない `{...}` を差し込み項目候補とみなす */
const TOKEN_PATTERN = /\{[^{}\n]+\}/g;

export function renderAnnouncement(
  body: string,
  input: AnnouncementEventInput,
): string {
  const values = new Map(
    ANNOUNCEMENT_PLACEHOLDERS.map((p) => [p.token, p.resolve(input)] as const),
  );
  return body.replace(TOKEN_PATTERN, (token) => values.get(token) ?? token);
}

export function findUnknownPlaceholders(body: string): string[] {
  const found = body.match(TOKEN_PATTERN) ?? [];
  return [...new Set(found.filter((t) => !KNOWN_TOKENS.has(t)))];
}

/** 告知テンプレート編集画面のプレビュー用サンプル値 */
export const SAMPLE_ANNOUNCEMENT_INPUT: AnnouncementEventInput = {
  name: "ゆる練",
  vol: 42,
  startAt: "2026-11-14T09:00:00Z",
  endAt: "2026-11-14T11:00:00Z",
  venueName: "有明会場",
  fee: 1000,
  capacity: 24,
  bookingLink:
    "https://high-q-reservation.onrender.com/events/xxxx?book=1&openExternalBrowser=1",
  introLink: "https://high-q-volleyball.onrender.com/",
};
