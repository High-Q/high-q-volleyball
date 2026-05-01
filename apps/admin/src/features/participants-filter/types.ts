import type { ExperienceLevel } from "@high-q/shared";

/**
 * 参加者一覧の検索・フィルタ状態。URL クエリ（?q= ?exp= ?ck=）と双方向同期。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D5)
 */
export interface ParticipantsFilter {
  /** 名前 / メールへの部分一致検索文字列。空文字 = 無効 */
  q: string;
  /** undefined = 「すべて」（URL クエリから削除） */
  experience?: ExperienceLevel;
  /** undefined = 「すべて」 */
  checkinState?: CheckinState;
}

export type CheckinState = "checked" | "unchecked";

export const DEFAULT_FILTER: ParticipantsFilter = {
  q: "",
};

export const VALID_EXPERIENCE: readonly ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "experienced",
] as const;

export const VALID_CHECKIN: readonly CheckinState[] = [
  "checked",
  "unchecked",
] as const;
