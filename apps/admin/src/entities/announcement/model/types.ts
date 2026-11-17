import type { AnnouncementId, MemberId } from "@high-q/shared";

/**
 * announcements 1 行（camelCase 化済み）。サイト内に掲示する汎用お知らせ。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/admin-announcements/spec.md
 *   supabase/migrations/20261118000000_announcements.sql
 */

/** 出す相手。public=公開(LP) / members=会員(予約) / all=両方。 */
export type AnnouncementAudience = "public" | "members" | "all";

/** 掲載状態（掲載開始・終了とサーバー時刻から導出）。 */
export type AnnouncementStatus = "scheduled" | "active" | "ended";

export interface Announcement {
  id: AnnouncementId;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  /** ISO 8601。掲載開始時刻。 */
  publishStart: string;
  /** ISO 8601 または null（無期限）。掲載終了時刻（排他的上限）。 */
  publishEnd: string | null;
  createdBy: MemberId | null;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
}

/**
 * 作成・更新で DB へ渡すペイロード（timestamptz は ISO 文字列）。
 * `publishStart` / `publishEnd` は lib/announcementSchedule で日付 → JST 境界に変換した値。
 */
export interface AnnouncementWrite {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  publishStart: string;
  publishEnd: string | null;
}
