import type { AnnouncementStatus } from "../model/types";

/**
 * お知らせの掲載期間（日付入力）と JST 境界の timestamptz の相互変換、
 * および掲載状態の導出。端末のタイムゾーンに依存しないよう、変換はすべて
 * JST（+09:00）を明示した文字列操作と UTC 基準の日付計算で行う。
 *
 * - 掲載開始日 `D`      → `D` の JST 00:00（`D T00:00:00+09:00`）
 * - 掲載終了日 `D`（任意）→ 翌日 `D+1` の JST 00:00（排他的上限 = `D` 当日いっぱい表示）
 *
 * 関連:
 *   openspec/changes/general-announcements/design.md D4
 *   apps/admin/src/widgets/event-form/model/eventStateMapper.ts（JST 変換の先例）
 */

const TZ_OFFSET_MIN = 9 * 60;

/** `YYYY-MM-DD` の日付文字列に n 日加算した `YYYY-MM-DD` を返す（UTC 基準で TZ 非依存）。 */
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** ISO タイムスタンプを JST の `YYYY-MM-DD` に変換する。 */
export function isoToJstDate(iso: string): string {
  const utc = new Date(iso);
  const jst = new Date(utc.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** 掲載開始日（`YYYY-MM-DD`）を JST 00:00 の ISO 文字列に変換する。 */
export function startDateToIso(date: string): string {
  return `${date}T00:00:00+09:00`;
}

/** 掲載終了日（`YYYY-MM-DD`）を翌日 JST 00:00 の ISO（排他的上限）に変換する。空文字は null（無期限）。 */
export function endDateToIso(date: string): string | null {
  if (!date) return null;
  return `${addDays(date, 1)}T00:00:00+09:00`;
}

/** 掲載開始の ISO を、フォーム用の掲載開始日（`YYYY-MM-DD`）に戻す。 */
export function isoToStartDate(iso: string): string {
  return isoToJstDate(iso);
}

/** 掲載終了の ISO（排他的上限）を、フォーム用の掲載終了日（`YYYY-MM-DD`）に戻す。null は空文字。 */
export function isoToEndDate(iso: string | null): string {
  if (!iso) return "";
  return addDays(isoToJstDate(iso), -1);
}

/**
 * 掲載状態を導出する。
 * - now < 掲載開始            → scheduled（掲載予定）
 * - 掲載終了あり かつ now >= 掲載終了 → ended（掲載終了）
 * - それ以外                  → active（掲載中）
 */
export function deriveAnnouncementStatus(
  announcement: { publishStart: string; publishEnd: string | null },
  now: Date = new Date(),
): AnnouncementStatus {
  const nowMs = now.getTime();
  const startMs = new Date(announcement.publishStart).getTime();
  if (nowMs < startMs) return "scheduled";
  if (announcement.publishEnd !== null && nowMs >= new Date(announcement.publishEnd).getTime()) {
    return "ended";
  }
  return "active";
}
