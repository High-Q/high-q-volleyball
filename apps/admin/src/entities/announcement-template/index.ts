/**
 * entities/announcement-template の Public API (#386)。
 *
 * 告知テンプレートの型・取得 / 保存・差し込み展開・予約リンク生成。
 * features/line-announcement（告知文ダイアログ）と
 * features/announcement-template-edit（テンプレート編集）の両方から使うため entities に置く。
 *
 * 関連:
 *   openspec/changes/line-announcement-copy/specs/admin-line-announcement/spec.md
 */

export {
  ANNOUNCEMENT_BODY_MAX,
  type AnnouncementChannel,
  type AnnouncementTemplate,
} from "./model/types";
export { DEFAULT_LINE_TEMPLATE } from "./model/defaultTemplate";
export {
  ANNOUNCEMENT_PLACEHOLDERS,
  SAMPLE_ANNOUNCEMENT_INPUT,
  findUnknownPlaceholders,
  renderAnnouncement,
  type AnnouncementEventInput,
  type AnnouncementPlaceholder,
} from "./lib/renderAnnouncement";
export { buildBookingLink } from "./lib/buildBookingLink";
export {
  fetchAnnouncementTemplate,
  saveAnnouncementTemplate,
  type FetchError as AnnouncementTemplateFetchError,
  type FetchErrorCode as AnnouncementTemplateFetchErrorCode,
} from "./api/announcementTemplateQueries";
