import { type Result, ok, err, appError } from "@high-q/shared";
import type {
  VenueId,
  EventVisibility,
  Event,
  EventInsert,
  EventUpdate,
  EventId,
} from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  EventListRow,
  Period,
  SortDir,
  SortKey,
} from "../model/event.types";

/**
 * `event_list_view` を fetch する API layer。
 *
 * 関連:
 *   openspec/changes/admin-events-list-screen/specs/admin-events-list/spec.md
 *   openspec/changes/admin-events-list-screen/design.md (D1, §5)
 */

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED";

export interface EventReservationBreakdown {
  reserved: number;
  attended: number;
  cancelled: number;
  no_show: number;
  waitlist: number;
}

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}

export interface EventsListFilter {
  period: Period;
  venueId?: VenueId;
  visibility?: EventVisibility;
  search: string;
  sort: SortKey;
  dir: SortDir;
  page: number;
  per: number;
}

export interface EventsListResult {
  rows: EventListRow[];
  total: number;
}

const SORT_COLUMN: Record<SortKey, string> = {
  date: "start_at",
  status: "visibility",
};

interface PeriodRange {
  gte?: { column: "start_at"; value: string };
  lt?: { column: "end_at" | "start_at"; value: string };
}

function periodRange(period: Period, now: Date): PeriodRange {
  if (period === "all") return {};
  if (period === "upcoming") {
    return { gte: { column: "start_at", value: now.toISOString() } };
  }
  if (period === "past-all") {
    return { lt: { column: "end_at", value: now.toISOString() } };
  }
  // this-month / last-month: JST 起点で月初〜次月初を出す
  const TZ_OFFSET_MIN = 9 * 60;
  const jstNow = new Date(now.getTime() + TZ_OFFSET_MIN * 60_000);
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const monthOffset = period === "this-month" ? 0 : -1;
  const start = new Date(Date.UTC(year, month + monthOffset, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + monthOffset + 1, 1, 0, 0, 0));
  // JST 月初を UTC で表現するため -9h 補正
  const startUtc = new Date(start.getTime() - TZ_OFFSET_MIN * 60_000);
  const endUtc = new Date(end.getTime() - TZ_OFFSET_MIN * 60_000);
  return {
    gte: { column: "start_at", value: startUtc.toISOString() },
    lt: { column: "start_at", value: endUtc.toISOString() },
  };
}

function classifyError(error: { code?: string; message: string }): FetchErrorCode {
  if (
    error.code === "42501" ||
    /permission/i.test(error.message)
  ) {
    return "PERMISSION_DENIED";
  }
  return "SERVER_ERROR";
}

export async function fetchEventsList(
  filter: EventsListFilter,
  now: Date = new Date(),
): Promise<Result<EventsListResult, FetchError>> {
  const supabase = getSupabase();

  try {
    let query = supabase
      .from("event_list_view")
      .select("*", { count: "exact" });

    const range = periodRange(filter.period, now);
    if (range.gte) {
      query = query.gte(range.gte.column, range.gte.value);
    }
    if (range.lt) {
      query = query.lt(range.lt.column, range.lt.value);
    }

    if (filter.venueId !== undefined) {
      query = query.eq("venue_id", filter.venueId as unknown as string);
    }
    if (filter.visibility !== undefined) {
      query = query.eq("visibility", filter.visibility);
    }
    if (filter.search.length > 0) {
      const escaped = filter.search.replace(/[,]/g, " ");
      query = query.or(
        `name.ilike.%${escaped}%,venue_name.ilike.%${escaped}%`,
      );
    }

    query = query.order(SORT_COLUMN[filter.sort], {
      ascending: filter.dir === "asc",
    });

    const start = (filter.page - 1) * filter.per;
    const end = start + filter.per - 1;
    const { data, error, count } = await query.range(start, end);

    if (error) {
      return err(
        appError(classifyError(error), error.message) as FetchError,
      );
    }

    return ok({
      rows: (data ?? []) as EventListRow[],
      total: count ?? 0,
    });
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({
        code: "NETWORK_ERROR",
        message: cause.message,
      });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

// =============================================================================
// admin-events-crud-screen (#86) — single-event CRUD
// =============================================================================

/**
 * 単一 event を id で取得する。
 *
 * - 行が見つからない場合は `ok(null)` を返す（404 を Error 扱いしない）
 * - RLS 拒否は `PERMISSION_DENIED`
 *
 * 関連: openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 */
export async function getEventById(
  id: EventId,
): Promise<Result<Event | null, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id as unknown as string)
      .maybeSingle();
    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }
    return ok((data as Event | null) ?? null);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

/**
 * 新規 event を INSERT する。
 *
 * **D3 即時公開ポリシー**: 呼び出し側が `visibility` を渡しても `'published'` で
 * 上書きする。`capacity` / `description` / `cancel_deadline` は MVP1 で UI に
 * 出さないため `NULL` を投入する。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/design.md (D3, §3.2, §5)
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 */
export async function createEvent(
  input: EventInsert,
): Promise<Result<Event, FetchError>> {
  const supabase = getSupabase();
  // visibility / capacity / description / cancel_deadline は意図的に固定する
  // （呼び出し側の値は無視）
  const payload = {
    name: input.name,
    start_at: input.start_at,
    end_at: input.end_at,
    venue_id: input.venue_id,
    fee: input.fee ?? null,
    visibility: "published" as EventVisibility,
    capacity: null,
    description: null,
    cancel_deadline: null,
    ...(input.created_by !== undefined ? { created_by: input.created_by } : {}),
  };
  try {
    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }
    return ok(data as Event);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

/**
 * 既存 event を UPDATE する。
 *
 * 既存値保護のため `visibility` / `capacity` / `description` / `cancel_deadline`
 * / `status` は **ペイロードに含めない**（D3, MVP1 押し下げ列）。`EventUpdate` 型
 * には元々これらが含まれないが、攻撃的呼び出しに備えて allowlist で再フィルタ
 * する。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/design.md (D3, §3.3)
 */
export async function updateEvent(
  id: EventId,
  patch: EventUpdate,
): Promise<Result<Event, FetchError>> {
  const supabase = getSupabase();
  // allowlist で安全な列のみ抽出
  const safe: Record<string, unknown> = {};
  const p = patch as Record<string, unknown>;
  if ("name" in p) safe.name = p.name;
  if ("start_at" in p) safe.start_at = p.start_at;
  if ("end_at" in p) safe.end_at = p.end_at;
  if ("venue_id" in p) safe.venue_id = p.venue_id;
  if ("fee" in p) safe.fee = p.fee;
  try {
    const { data, error } = await supabase
      .from("events")
      .update(safe)
      .eq("id", id as unknown as string)
      .select("*")
      .single();
    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }
    return ok(data as Event);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

/**
 * event を DELETE する。
 *
 * #253 の方針変更により、reservations.event_id FK は ON DELETE CASCADE。
 * event を DELETE すると紐づく reservations 全行が連鎖削除される。AlertDialog
 * 二段階確認 + 予約内訳の事前表示 (classifyEventReservations) で誤操作を防ぐ。
 *
 * 関連:
 *   openspec/changes/fix-admin-event-delete-cancelled-reservations/specs/admin-events-crud/spec.md
 *   openspec/changes/fix-admin-event-delete-cancelled-reservations/specs/data-schema/spec.md
 */
export async function deleteEvent(
  id: EventId,
): Promise<Result<void, FetchError>> {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id as unknown as string);
    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }
    return ok(undefined);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

/**
 * 単一 event に紐づく reservations を status 別に集計する。
 *
 * 用途:
 *   削除 AlertDialog で「N 件の予約も同時に削除されます」を表示するために、
 *   active (reserved + attended) と cancelled (cancelled + no_show) の件数を
 *   事前に提示する。
 *
 * 関連:
 *   openspec/changes/fix-admin-event-delete-cancelled-reservations/specs/admin-events-crud/spec.md
 */
export async function classifyEventReservations(
  id: EventId,
): Promise<Result<EventReservationBreakdown, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("status")
      .eq("event_id", id as unknown as string);
    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }
    const breakdown: EventReservationBreakdown = {
      reserved: 0,
      attended: 0,
      cancelled: 0,
      no_show: 0,
      waitlist: 0,
    };
    for (const row of (data ?? []) as Array<{ status: keyof EventReservationBreakdown }>) {
      if (row.status in breakdown) {
        breakdown[row.status] += 1;
      }
    }
    return ok(breakdown);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

export interface ActiveReservationRecipient {
  memberId: string;
  email: string;
}

export interface EventCancellationMeta {
  eventName: string;
  startAtIso: string;
  venueName: string;
}

/**
 * イベント削除時のキャンセル通知メール本文に必要な event meta + venue name を
 * 1 件 SELECT で取得する。`fetchActiveReservationRecipients` と並列実行する想定。
 *
 * 関連:
 *   openspec/changes/notify-event-cancellation-on-delete/specs/event-cancellation-notification-email/spec.md
 */
export async function fetchEventCancellationMeta(
  id: EventId,
): Promise<Result<EventCancellationMeta | null, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("events")
      .select("name, start_at, venues:venue_id(name)")
      .eq("id", id as unknown as string)
      .maybeSingle();
    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }
    if (!data) {
      return ok(null);
    }
    // Supabase の埋め込み JOIN は単一/複数を問わず array を返すため、
    // venues は配列または単一オブジェクトの両方を許容する型で受ける。
    type EmbeddedVenue = { name: string };
    type Row = {
      name: string;
      start_at: string;
      venues: EmbeddedVenue | EmbeddedVenue[] | null;
    };
    const row = data as unknown as Row;
    const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
    const venueName = venue?.name ?? "";
    return ok({
      eventName: row.name,
      startAtIso: row.start_at,
      venueName,
    });
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

/**
 * 単一 event の有効予約者 (`status in ('reserved', 'attended')`) に紐づく
 * `members.email` をスナップショット取得する。
 *
 * 用途: #272 イベント削除時のキャンセル通知メール送信先決定。CASCADE 削除前に
 * 必ず呼ぶ MUST。削除後は reservations 行が消えるため取得不能になる。
 *
 * 同一 memberId が複数の active reservation を保持することは構造上発生しないが、
 * 防御的に memberId をキーとして重複排除する。
 *
 * 関連:
 *   openspec/changes/notify-event-cancellation-on-delete/specs/event-cancellation-notification-email/spec.md
 */
export async function fetchActiveReservationRecipients(
  id: EventId,
): Promise<Result<ActiveReservationRecipient[], FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("reservations")
      .select("member_id, members:member_id(id, email)")
      .eq("event_id", id as unknown as string)
      .in("status", ["reserved", "attended"]);
    if (error) {
      return err({
        code: classifyError(error),
        message: error.message,
      });
    }
    const dedup = new Map<string, string>();
    type EmbeddedMember = { id: string; email: string };
    type Row = {
      member_id: string | null;
      members: EmbeddedMember | EmbeddedMember[] | null;
    };
    for (const row of ((data ?? []) as unknown as Row[])) {
      const member = Array.isArray(row.members) ? row.members[0] : row.members;
      if (!member || !member.id || !member.email) continue;
      if (!dedup.has(member.id)) {
        dedup.set(member.id, member.email);
      }
    }
    return ok(
      Array.from(dedup, ([memberId, email]) => ({ memberId, email })),
    );
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}
