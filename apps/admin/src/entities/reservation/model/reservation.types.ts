import type {
  EventId,
  ExperienceLevel,
  MemberId,
  ReservationId,
  ReservationStatus,
} from "@high-q/shared";

/**
 * apps/admin の /events/:id 画面が扱う event_participants_view の DTO 型。
 *
 * snake_case で view 列と 1:1 対応する。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/data-schema/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D1, D2)
 *   supabase/migrations/20260501210240_event_detail_views.sql
 */
export interface ParticipantRow {
  reservation_id: ReservationId;
  event_id: EventId;
  member_id: MemberId;
  display_name: string;
  email: string;
  experience_level: ExperienceLevel;
  guest_count: number;
  status: ReservationStatus;
  /** NULL = 未チェックイン、ISO 8601 文字列 = チェックイン済 */
  checked_in_at: string | null;
  /** 予約日時 (reservations.created_at) */
  created_at: string;
  /** 当該 member が当該 event.start_at より前に他イベントで attended ゼロなら true (D2) */
  is_first_time: boolean;
}
