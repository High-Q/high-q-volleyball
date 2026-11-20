/**
 * LP（公開サイト）で表示するお知らせの型。表示に必要な最小列のみ保持する。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/lp-announcements/spec.md
 *   supabase/migrations/20261118000000_announcements.sql
 */
export interface LpAnnouncement {
  id: string
  title: string
  body: string
  /** 掲載開始時刻（並び順の基準）。 */
  publishStart: Date
}
