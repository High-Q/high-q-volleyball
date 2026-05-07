import type { PostgrestError } from "@supabase/supabase-js";
import { unsafeEventId, unsafeMemberId, unsafeReservationId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  CreateBookingInput,
  Reservation,
  ReservationId,
  ReservationRow,
  UpdateBookingInput,
} from "@/entities/reservation";

/**
 * booking-client が呼び出し側に通知するエラー分類。
 *
 * - `duplicate`: UNIQUE 違反 (同一会員 × 同一イベントの再予約)
 * - `rls`: RLS 違反 (member_id 改ざん 等) または 0 行更新
 * - `network`: 上記に分類できない通信エラー / Postgres エラー
 */
export class BookingApiError extends Error {
  readonly kind: "duplicate" | "rls" | "network";
  override readonly cause: PostgrestError | Error | null;

  constructor(
    kind: "duplicate" | "rls" | "network",
    cause: PostgrestError | Error | null = null,
    message?: string,
  ) {
    super(message ?? kind);
    this.name = "BookingApiError";
    this.kind = kind;
    this.cause = cause;
  }
}

const POSTGRES_UNIQUE_VIOLATION = "23505";
const POSTGRES_RLS_VIOLATION = "42501";

/**
 * reservations への INSERT。
 *
 * `(event_id, member_id)` には UNIQUE 制約があり、キャンセル済 (status='cancelled')
 * の同一組み合わせ行が残っていると INSERT は 23505 になる。data-schema spec で
 * 「キャンセル後の再予約は status の更新で対応」と定義されているため、
 * 23505 を捕捉したらキャンセル済行を 'reserved' に戻す UPDATE を発行する。
 *
 * - status default は 'reserved' を利用 (INSERT 時は明示しない)
 * - cancelled_at は DB トリガーが自動設定 / NULL クリアは UPDATE 時に明示する
 */
export async function insertReservation(
  input: CreateBookingInput,
): Promise<Reservation> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reservations")
    .insert({
      event_id: input.eventId as string,
      member_id: input.memberId as string,
      guest_count: input.guestCount,
      note: input.note.length === 0 ? null : input.note,
      phone_at_booking:
        input.phoneAtBooking.length === 0 ? null : input.phoneAtBooking,
    })
    .select(
      "id, event_id, member_id, status, guest_count, phone_at_booking, note, checked_in_at, cancelled_at, created_at, updated_at",
    )
    .single();

  if (error !== null) {
    if (error.code === POSTGRES_UNIQUE_VIOLATION) {
      return await reactivateCancelledReservation(input);
    }
    throw mapPostgrestError(error);
  }
  if (data === null) {
    throw new BookingApiError("network", null, "Empty insert response");
  }
  return rowToReservation(data as unknown as ReservationRow);
}

/**
 * 既存のキャンセル済行を 'reserved' に戻す。`reserved` 状態の行が見つかった場合は
 * 真の重複予約として `duplicate` エラーを返す。
 */
async function reactivateCancelledReservation(
  input: CreateBookingInput,
): Promise<Reservation> {
  const supabase = getSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from("reservations")
    .select("id, status")
    .eq("event_id", input.eventId as string)
    .eq("member_id", input.memberId as string)
    .maybeSingle();

  if (fetchError !== null) {
    throw mapPostgrestError(fetchError);
  }
  if (existing === null) {
    throw new BookingApiError(
      "network",
      null,
      "Unique violation but no existing row",
    );
  }
  if (existing.status === "reserved") {
    throw new BookingApiError("duplicate");
  }

  const { data, error } = await supabase
    .from("reservations")
    .update({
      status: "reserved",
      guest_count: input.guestCount,
      note: input.note.length === 0 ? null : input.note,
      phone_at_booking:
        input.phoneAtBooking.length === 0 ? null : input.phoneAtBooking,
      cancelled_at: null,
    })
    .eq("id", existing.id)
    .select(
      "id, event_id, member_id, status, guest_count, phone_at_booking, note, checked_in_at, cancelled_at, created_at, updated_at",
    )
    .single();

  if (error !== null) {
    throw mapPostgrestError(error);
  }
  if (data === null) {
    throw new BookingApiError("network", null, "Empty update response");
  }
  return rowToReservation(data as unknown as ReservationRow);
}

/**
 * 自分の予約 (status='reserved') の `guest_count` / `note` を UPDATE する。
 *
 * - WHERE 句に `id = reservationId` AND `member_id = uid` AND `status = 'reserved'` を明示し、
 *   RLS への単独依存を避けて二重防衛とする。
 * - 0 行更新は RLS 違反 (他人の id 改ざん) / status が reserved ではない等のため `rls` として扱う。
 * - 期限判定 (`isCancellable`) は本層では行わない。UI / composable 層の責務。
 */
export async function updateReservation(
  input: UpdateBookingInput,
): Promise<Reservation> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reservations")
    .update({
      guest_count: input.guestCount,
      note: input.note.length === 0 ? null : input.note,
    })
    .eq("id", input.reservationId as string)
    .eq("member_id", input.memberId as string)
    .eq("status", "reserved")
    .select(
      "id, event_id, member_id, status, guest_count, phone_at_booking, note, checked_in_at, cancelled_at, created_at, updated_at",
    );

  if (error !== null) {
    throw mapPostgrestError(error);
  }
  if (data === null || data.length === 0) {
    throw new BookingApiError("rls", null, "No row updated");
  }
  return rowToReservation(data[0] as unknown as ReservationRow);
}

/**
 * reservations の status を `'reserved' → 'cancelled'` に UPDATE。
 * 0 行更新は RLS 違反 (他人の id) または既にキャンセル済み等のため `rls` として扱う。
 */
export async function cancelReservation(id: ReservationId): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id as string)
    .eq("status", "reserved")
    .select("id");

  if (error !== null) {
    throw mapPostgrestError(error);
  }
  if (data === null || data.length === 0) {
    throw new BookingApiError("rls", null, "No row updated");
  }
}

function mapPostgrestError(error: PostgrestError): BookingApiError {
  if (error.code === POSTGRES_UNIQUE_VIOLATION) {
    return new BookingApiError("duplicate", error);
  }
  if (error.code === POSTGRES_RLS_VIOLATION) {
    return new BookingApiError("rls", error);
  }
  return new BookingApiError("network", error);
}

function rowToReservation(row: ReservationRow): Reservation {
  return {
    id: unsafeReservationId(row.id),
    eventId: unsafeEventId(row.event_id),
    memberId: unsafeMemberId(row.member_id),
    status: row.status,
    guestCount: row.guest_count,
    phoneAtBooking: row.phone_at_booking,
    note: row.note,
  };
}
