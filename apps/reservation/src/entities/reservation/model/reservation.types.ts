/**
 * Reservation (予約) に関する型定義。
 *
 * - `ReservationId` / `EventId` / `MemberId` は `@high-q/shared` の正規定義を再 export する。
 * - 本 entity は予約フロー (確認 / 完了 / キャンセル) で共有される DB 行型 / camelCase 型 / フォーム入力型を提供する。
 *
 * 関連:
 *   openspec/changes/reservation-booking-flow/specs/reservation-booking-flow/spec.md
 *   openspec/changes/reservation-booking-flow/design.md (D7)
 */

import type {
  EventId as SharedEventId,
  MemberId as SharedMemberId,
  ReservationId as SharedReservationId,
} from "@high-q/shared";

export type ReservationId = SharedReservationId;
export type EventId = SharedEventId;
export type MemberId = SharedMemberId;

/** reservations.status の許容値 (data-schema spec 準拠) */
export type ReservationStatus =
  | "reserved"
  | "cancelled"
  | "attended"
  | "no_show"
  | "waitlist";

/**
 * `reservations` テーブルの DB 行 (snake_case)。
 * Supabase クエリビルダの `.select("*")` で取得した形に対応。
 */
export type ReservationRow = {
  id: string;
  event_id: string;
  member_id: string;
  status: ReservationStatus;
  guest_count: number;
  phone_at_booking: string | null;
  note: string | null;
  checked_in_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * 予約フロー UI 内で扱う Reservation (camelCase)。
 */
export type Reservation = {
  id: ReservationId;
  eventId: EventId;
  memberId: MemberId;
  status: ReservationStatus;
  guestCount: number;
  phoneAtBooking: string | null;
  note: string | null;
};

/**
 * 予約詳細画面 (`/reservations/:reservationId`) で表示する自分の予約 + 紐付くイベント / 会場情報。
 *
 * `MyReservationItem` (履歴一覧用) を拡張し、詳細画面 Meta テーブル用に
 * `createdAt` (予約日時) を追加する。
 *
 * 関連:
 *   openspec/specs/reservation-detail-page/spec.md
 */
export type MyReservationDetail = {
  id: ReservationId;
  status: ReservationStatus;
  guestCount: number;
  /** 連絡事項。Meta テーブルでは表示しないが、編集 sheet の初期値供給に必要 */
  note: string;
  createdAt: string;
  cancelledAt: string | null;
  event: {
    id: EventId;
    name: string;
    startAt: string;
    endAt: string;
    fee: number | null;
    venueName: string;
    /** 予約埋まり具合 (Issue #305)。取得失敗時は null */
    availability: import("@/entities/event").EventAvailability | null;
  };
};

/**
 * 確認画面で入力されるフォーム値。phone は members.phone 未登録時のみ入力される。
 */
export type BookingDraft = {
  guestCount: number;
  note: string;
  phone?: string;
};

/**
 * `useCreateBooking.create()` の入力。member_id は呼び出し側で auth.uid() から解決する。
 */
export type CreateBookingInput = {
  eventId: EventId;
  memberId: MemberId;
  guestCount: number;
  note: string;
  phoneAtBooking: string;
};

/**
 * 予約フロー全体で発生し得るエラー分類。
 *
 * - `duplicate`: 同一会員が同一イベントに対して既に reserved 状態の予約を持つ (UNIQUE 違反 23505)
 * - `rls`: RLS WITH CHECK 違反 (member_id 改ざん等) または 0 行更新
 * - `not_cancellable`: 開催当日 0:00 JST 以降でキャンセル不可
 * - `not_editable`: 開催当日 0:00 JST 以降で編集不可 (キャンセル可否と同基準)
 * - `network`: 上記に分類できない通信エラー
 * - `unknown`: 想定外のエラー
 */
export type BookingError =
  | "duplicate"
  | "rls"
  | "not_cancellable"
  | "not_editable"
  | "network"
  | "unknown";

/**
 * `useUpdateBooking.update()` の入力。同伴者数 / 連絡事項のみ編集可能。
 */
export type UpdateBookingInput = {
  reservationId: ReservationId;
  memberId: MemberId;
  guestCount: number;
  note: string;
};
