/**
 * entities/announcement の Public API（general-announcements / #395）。
 *
 * サイト内に掲示する汎用お知らせの型・CRUD・掲載期間/状態の導出。
 * widgets/announcements-master-detail（管理 UI）と features/announcement-delete から使う。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/admin-announcements/spec.md
 */

export type {
  Announcement,
  AnnouncementAudience,
  AnnouncementStatus,
  AnnouncementWrite,
} from "./model/types";

export {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type FetchError as AnnouncementFetchError,
  type FetchErrorCode as AnnouncementFetchErrorCode,
} from "./api/announcementQueries";

export {
  deriveAnnouncementStatus,
  startDateToIso,
  endDateToIso,
  isoToStartDate,
  isoToEndDate,
  isoToJstDate,
} from "./lib/announcementSchedule";
