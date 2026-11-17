/**
 * entities/announcement の Public API（general-announcements / #395・予約サイト表示）。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/reservation-announcements/spec.md
 */
export type { Announcement } from "./model/types";
export { fetchMemberAnnouncements } from "./api/announcement-client";
