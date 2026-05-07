/**
 * Asia/Tokyo (JST, UTC+9) 固定で Date の暦パーツを取り出すヘルパ。
 *
 * 既定の `getFullYear()` / `getMonth()` / `getHours()` 等はランタイムのローカル
 * タイムゾーンに依存し、CI (UTC) とローカル (JST) で結果が変わる。本サービスは
 * 日本ユーザー前提のため、すべて JST 固定で計算・表示する。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Date を JST にシフトした「見かけ上 UTC として読める」Date を返す内部ヘルパ */
function shiftToJst(d: Date): Date {
  return new Date(d.getTime() + JST_OFFSET_MS);
}

export function jstYear(d: Date): number {
  return shiftToJst(d).getUTCFullYear();
}

/** 0-indexed (1 月 = 0) */
export function jstMonth(d: Date): number {
  return shiftToJst(d).getUTCMonth();
}

export function jstDay(d: Date): number {
  return shiftToJst(d).getUTCDate();
}

export function jstHours(d: Date): number {
  return shiftToJst(d).getUTCHours();
}

export function jstMinutes(d: Date): number {
  return shiftToJst(d).getUTCMinutes();
}

/** 0=Sunday, 1=Monday, ..., 6=Saturday */
export function jstWeekday(d: Date): number {
  return shiftToJst(d).getUTCDay();
}

/** JST の暦日 (0:00 JST 起点) を表す Date を返す。日数差計算で使う */
export function jstStartOfDay(d: Date): Date {
  const j = shiftToJst(d);
  return new Date(
    Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), j.getUTCDate()),
  );
}
