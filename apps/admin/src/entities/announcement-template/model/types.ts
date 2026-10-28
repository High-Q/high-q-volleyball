import type { MemberId } from "@high-q/shared";

/**
 * 告知テンプレートのチャネル。現状は LINE のみ（DB の CHECK 制約と一致）。
 */
export type AnnouncementChannel = "line";

/** announcement_templates 1 行（camelCase 化済み） */
export interface AnnouncementTemplate {
  channel: AnnouncementChannel;
  body: string;
  /** ISO 8601 */
  updatedAt: string;
  updatedBy: MemberId | null;
}

/** テンプレート本文の上限（LINE 1 メッセージ上限。DB の CHECK 制約と一致） */
export const ANNOUNCEMENT_BODY_MAX = 5000;
