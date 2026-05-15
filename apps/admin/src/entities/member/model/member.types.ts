import type {
  EventId,
  ExperienceLevel,
  MemberId,
  ReservationId,
  ReservationStatus,
} from "@high-q/shared";

/**
 * apps/admin の `/members` 画面が扱う view の DTO 型。
 *
 * snake_case で view 列と 1:1 対応する。Branded Types で id 列を表現し、
 * `event-detail` entity と同様に DB 由来データを型安全に扱う。
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/data-schema/spec.md
 *   openspec/changes/admin-members-list-screen/design.md (D1, D8)
 *   supabase/migrations/20260515133901_add_members_admin_note_and_views.sql
 */

/**
 * `member_list_view` の DTO。一覧画面の 1 行。
 */
export interface MemberListRow {
  id: MemberId;
  display_name: string;
  email: string;
  experience_level: ExperienceLevel;
  /** 運営側メモ。NULL 可。本人 UPDATE は RLS で拒否される。 */
  admin_note: string | null;
  /** member の作成日時 (参考列、UI ソート対象外)。 */
  created_at: string;
  /** 最古 attended events.start_at。attended 履歴ゼロのとき NULL。 */
  first_attended_at: string | null;
  /** status='attended' の件数 (member 数ベース、同伴は含まない)。 */
  attended_count: number;
  /** 最新 attended events.start_at。attended 履歴ゼロのとき NULL。 */
  last_attended_at: string | null;
}

/**
 * `member_history_view` の DTO。詳細 sheet の参加履歴 1 行。
 * cancelled は view 側で除外済み。
 */
export interface MemberHistoryRow {
  reservation_id: ReservationId;
  member_id: MemberId;
  event_id: EventId;
  event_name: string;
  start_at: string;
  venue_name: string | null;
  /** cancelled は view から除外されるため値の範囲は reserved/attended/no_show/waitlist。 */
  status: ReservationStatus;
  guest_count: number;
  checked_in_at: string | null;
  /** 当該 reservation の event が当該 member の初回 attended に該当する場合 true。 */
  is_first_time: boolean;
}

/**
 * PageHeader のサマリ DTO（総会員数 + 今月初参加数）。
 */
export interface MemberSummary {
  total: number;
  first_this_month: number;
}

/**
 * `experience_level` の表示ラベル。既存 admin event-participants と同じ規約 (#150 design.md D10)。
 */
export const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  beginner: "初回",
  intermediate: "中級",
  experienced: "経験者",
} as const;

