import type { MemberId } from "@high-q/shared";

/**
 * 告知テンプレートのチャネル（DB の CHECK 制約と一致）。
 * - line: LINE オープンチャット（既に High Q を知っている参加者向け）
 * - x: X（High Q を知らない人向け）
 */
export type AnnouncementChannel = "line" | "x";

export const ANNOUNCEMENT_CHANNELS: ReadonlyArray<{
  channel: AnnouncementChannel;
  label: string;
}> = [
  { channel: "line", label: "LINE" },
  { channel: "x", label: "X" },
];

export function isAnnouncementChannel(v: unknown): v is AnnouncementChannel {
  return v === "line" || v === "x";
}

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
