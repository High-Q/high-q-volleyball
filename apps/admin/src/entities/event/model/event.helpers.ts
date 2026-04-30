import type {
  DisplayStatus,
  EventListRow,
} from "./event.types";
import type { EventVisibility } from "@high-q/shared";

/**
 * Badge 表示用ステータスの解決。
 * 優先順位: status='cancelled' → status='closed' or end_at < now → visibility。
 *
 * 関連: openspec/changes/admin-events-list-screen/design.md (D4)
 */
export function resolveDisplayStatus(
  row: Pick<EventListRow, "status" | "visibility" | "end_at">,
  now: Date,
): DisplayStatus {
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "closed") return "closed";
  if (new Date(row.end_at).getTime() < now.getTime()) return "closed";
  return row.visibility;
}

const VISIBILITY_LABELS: Record<EventVisibility, string> = {
  published: "公開中",
  draft: "下書き",
  private: "限定公開",
};

export function translateVisibility(visibility: EventVisibility): string {
  return VISIBILITY_LABELS[visibility];
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

const TZ_OFFSET_MIN = 9 * 60; // JST 固定。MVP1 は admin が日本のみ運用。

function toJstParts(iso: string): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  weekday: number;
} {
  const utc = new Date(iso);
  // JST = UTC + 9h
  const jst = new Date(utc.getTime() + TZ_OFFSET_MIN * 60_000);
  return {
    year: jst.getUTCFullYear(),
    month: jst.getUTCMonth() + 1,
    day: jst.getUTCDate(),
    hours: jst.getUTCHours(),
    minutes: jst.getUTCMinutes(),
    weekday: jst.getUTCDay(),
  };
}

const pad2 = (n: number): string => n.toString().padStart(2, "0");

/** ISO 8601 → "YYYY/MM/DD (曜)" (JST)。 */
export function formatDateLabel(iso: string): string {
  const { year, month, day, weekday } = toJstParts(iso);
  return `${year}/${pad2(month)}/${pad2(day)} (${WEEKDAY_JA[weekday]})`;
}

/** ISO 8601 ペア → "HH:mm-HH:mm" (JST)。 */
export function formatTimeRange(startIso: string, endIso: string): string {
  const s = toJstParts(startIso);
  const e = toJstParts(endIso);
  return `${pad2(s.hours)}:${pad2(s.minutes)}-${pad2(e.hours)}:${pad2(e.minutes)}`;
}
