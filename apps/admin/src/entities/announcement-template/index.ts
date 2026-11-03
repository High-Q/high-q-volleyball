/**
 * entities/announcement-template の Public API (#386)。
 *
 * 告知テンプレート（LINE / X）の型・取得 / 保存・差し込み展開・予約リンク生成・X 文字数カウント。
 * features/line-announcement（告知文ダイアログ）と
 * features/announcement-template-edit（テンプレート編集）の両方から使うため entities に置く。
 *
 * 関連:
 *   openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 */

export {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_CHANNELS,
  isAnnouncementChannel,
  type AnnouncementChannel,
  type AnnouncementTemplate,
} from "./model/types";
export {
  DEFAULT_LINE_TEMPLATE,
  DEFAULT_X_TEMPLATE,
  DEFAULT_TEMPLATES,
} from "./model/defaultTemplate";
export { X_MAX_WEIGHTED, countXWeightedLength } from "./lib/xTextLength";
export {
  ANNOUNCEMENT_PLACEHOLDERS,
  SAMPLE_ANNOUNCEMENT_INPUT,
  findUnknownPlaceholders,
  renderAnnouncement,
  type AnnouncementEventInput,
  type AnnouncementPlaceholder,
} from "./lib/renderAnnouncement";
export { buildBookingLink, type BuildBookingLinkOptions } from "./lib/buildBookingLink";
export {
  fetchAnnouncementTemplate,
  saveAnnouncementTemplate,
  type FetchError as AnnouncementTemplateFetchError,
  type FetchErrorCode as AnnouncementTemplateFetchErrorCode,
} from "./api/announcementTemplateQueries";
