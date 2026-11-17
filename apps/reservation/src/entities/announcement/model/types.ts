import type { AnnouncementId } from "@high-q/shared";

/**
 * 会員向けに表示するお知らせ（camelCase 化済み）。
 *
 * 掲載期間・出す相手の絞り込みは RLS が担保するため、クライアントが受け取るのは
 * 「今まさに会員へ掲示すべき」行のみ。表示に必要な最小列だけを持つ。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/reservation-announcements/spec.md
 *   supabase/migrations/20261118000000_announcements.sql
 */
export interface Announcement {
  id: AnnouncementId;
  title: string;
  body: string;
  /** ISO 8601。掲載開始時刻（並び順にのみ使用）。 */
  publishStart: string;
}
