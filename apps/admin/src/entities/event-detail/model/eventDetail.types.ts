import type {
  EventId,
  EventStatus,
  EventVisibility,
  VenueId,
} from "@high-q/shared";

/**
 * apps/admin の /events/:id 画面が扱う event_detail_view の DTO 型。
 *
 * snake_case で view 列と 1:1 対応する。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/data-schema/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D1, D2)
 *   supabase/migrations/20260501210240_event_detail_views.sql
 */
export interface EventDetailRow {
  id: EventId;
  name: string;
  description: string | null;
  start_at: string; // ISO 8601
  end_at: string;
  venue_id: VenueId;
  venue_name: string | null;
  fee: number | null;
  /** NULL なら「予約数」表示、ありなら「残席」表示の動的切替（D8） */
  capacity: number | null;
  visibility: EventVisibility;
  status: EventStatus;
  cancel_deadline: string | null;
  /**
   * 予約数 (本人 + 同伴の合計人数)。
   * `SUM(1 + guest_count) FILTER (status IN ('reserved', 'attended'))`。
   * チェックイン操作で status が変わっても active な予約は減らないため不変。
   */
  reserved_count: number;
  /**
   * チェックイン済人数 (本人 + 同伴)。
   * `SUM(1 + guest_count) FILTER (status = 'attended')`。
   */
  checked_in_count: number;
  /**
   * 初回参加 member 数 (同伴は member 化されてないため対象外、D2)。
   * `COUNT(*) FILTER (status IN ('reserved', 'attended') AND is_first_time)`。
   */
  first_time_count: number;
  /**
   * キャンセル待ち人数 (本人 + 同伴)。MVP1 は常に 0、機能は MVP2。
   */
  waitlist_count: number;
  created_at: string;
  updated_at: string;
}
