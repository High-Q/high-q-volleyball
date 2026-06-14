import type { Event } from "@high-q/shared";
import type { EventFormState } from "./eventFormSchema";

/**
 * Event エンティティ ⇔ EventForm の state（文字列ベース）の相互変換。
 *
 * admin は当面日本のみ運用するため、events.start_at / end_at（timestamptz）は
 * JST 起点で date / time に分解し、入力も JST 起点で ISO8601 へ戻す。
 *
 * useEventForm（Edit 初期化）と duplicateSeed（複製シード）の双方から共有する。
 *
 * 関連:
 *   openspec/changes/admin-event-duplicate/design.md (D2)
 */

const TZ_OFFSET_MIN = 9 * 60;

function jstParts(iso: string): { date: string; time: string } {
  const utc = new Date(iso);
  const jst = new Date(utc.getTime() + TZ_OFFSET_MIN * 60_000);
  const yyyy = jst.getUTCFullYear();
  const mm = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mi = String(jst.getUTCMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

/** Event を EventForm の state に変換する（Edit mode の初期化に使用）。 */
export function eventToState(e: Event): EventFormState {
  const s = jstParts(e.start_at);
  const en = jstParts(e.end_at);
  return {
    name: e.name,
    date: s.date,
    startTime: s.time,
    endTime: en.time,
    venueId: e.venue_id as unknown as string,
    fee: e.fee == null ? "" : String(e.fee),
  };
}

/**
 * date "YYYY-MM-DD" + time "HH:mm" を JST 起点で ISO8601 timestamptz 文字列に。
 * 例: "2026-05-12" + "19:30" → "2026-05-12T19:30:00+09:00"
 */
export function toIsoJst(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}
