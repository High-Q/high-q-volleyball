import {
  type Result,
  ok,
  err,
  type CorrectionRequest,
  type MemberProfile,
  getCorrectionRequests,
} from "@high-q/shared";
import type { MemberId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  MemberHistoryRow,
  MemberListRow,
  MemberSummary,
} from "../model/member.types";

/**
 * `member_list_view` / `member_history_view` を fetch する API layer。
 * `members.admin_note` への UPDATE もここに集約する。
 *
 * 関連:
 *   openspec/changes/admin-members-list-screen/specs/admin-members-list/spec.md
 *   openspec/changes/admin-members-list-screen/design.md (D1, D8, D9)
 */

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED"
  | "NOT_FOUND";

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}

function classifyError(error: { code?: string; message: string }): FetchErrorCode {
  if (error.code === "42501" || /permission/i.test(error.message)) {
    return "PERMISSION_DENIED";
  }
  return "SERVER_ERROR";
}

// =============================================================================
// fetchMembersList
// =============================================================================

export type ExperienceFilter = "beginner" | "intermediate" | "experienced";
export type AttendedRange = "first" | "2-5" | "6-10" | "11+";
export type LastPeriod = "this-month" | "3m" | "6m+";

export type MembersListSortKey =
  | "last_attended_at"
  | "attended_count"
  | "first_attended_at"
  | "display_name";

export interface MembersListFilters {
  exp?: ExperienceFilter | null;
  attendedRange?: AttendedRange | null;
  lastPeriod?: LastPeriod | null;
  q?: string | null;
}

export interface MembersListSort {
  key: MembersListSortKey;
  dir: "asc" | "desc";
}

export interface MembersListPage {
  page: number;
  perPage?: number;
}

export interface MembersListResult {
  rows: MemberListRow[];
  total: number;
}

/**
 * `member_list_view` をフィルタ・ソート・ページネーション付きで取得する。
 */
export async function fetchMembersList(
  filters: MembersListFilters,
  sort: MembersListSort,
  pageInput: MembersListPage,
): Promise<Result<MembersListResult, FetchError>> {
  const supabase = getSupabase();
  const perPage = pageInput.perPage ?? 25;
  const page = Math.max(1, pageInput.page);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  try {
    let query = supabase
      .from("member_list_view")
      .select(
        "id, display_name, email, experience_level, admin_note, created_at, first_attended_at, attended_count, last_attended_at, correction_request_count",
        { count: "exact" },
      );

    if (filters.exp) {
      query = query.eq("experience_level", filters.exp);
    }

    if (filters.attendedRange) {
      const range = attendedRangeBounds(filters.attendedRange);
      if (range.min !== undefined) {
        query = query.gte("attended_count", range.min);
      }
      if (range.max !== undefined) {
        query = query.lte("attended_count", range.max);
      }
    }

    if (filters.lastPeriod) {
      const bound = lastPeriodBound(filters.lastPeriod, new Date());
      if (bound.gte) {
        query = query.gte("last_attended_at", bound.gte);
      }
      if (bound.lt) {
        query = query.lt("last_attended_at", bound.lt);
      }
      // last_attended_at IS NULL の会員は「すべて」以外では除外する
      // PostgREST: `not.is.null` で IS NOT NULL を表現
      query = query.not("last_attended_at", "is", null);
    }

    if (filters.q && filters.q.trim().length > 0) {
      const pattern = `%${filters.q.trim()}%`;
      query = query.or(
        `display_name.ilike.${pattern},email.ilike.${pattern},admin_note.ilike.${pattern}`,
      );
    }

    // NULL 並びを明示: desc 時は最後、asc 時は最後 (= 未参加会員は基本的に後ろ)
    query = query.order(sort.key, {
      ascending: sort.dir === "asc",
      nullsFirst: false,
    });

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok({
      rows: (data ?? []) as MemberListRow[],
      total: count ?? 0,
    });
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

function attendedRangeBounds(range: AttendedRange): {
  min?: number;
  max?: number;
} {
  switch (range) {
    case "first":
      return { min: 1, max: 1 };
    case "2-5":
      return { min: 2, max: 5 };
    case "6-10":
      return { min: 6, max: 10 };
    case "11+":
      return { min: 11 };
  }
}

function lastPeriodBound(
  period: LastPeriod,
  now: Date,
): { gte?: string; lt?: string } {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  switch (period) {
    case "this-month":
      return { gte: monthStart };
    case "3m":
      return { gte: threeMonthsAgo.toISOString() };
    case "6m+":
      return { lt: sixMonthsAgo.toISOString() };
  }
}

// =============================================================================
// fetchMembersSummary
// =============================================================================

/**
 * PageHeader 用サマリ。総会員数 + 今月初参加数。
 */
export async function fetchMembersSummary(): Promise<
  Result<MemberSummary, FetchError>
> {
  const supabase = getSupabase();
  try {
    const totalRes = await supabase
      .from("member_list_view")
      .select("id", { count: "exact", head: true });
    if (totalRes.error) {
      return err({
        code: classifyError(totalRes.error),
        message: totalRes.error.message,
      });
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const firstRes = await supabase
      .from("member_list_view")
      .select("id", { count: "exact", head: true })
      .gte("first_attended_at", monthStart.toISOString());
    if (firstRes.error) {
      return err({
        code: classifyError(firstRes.error),
        message: firstRes.error.message,
      });
    }
    return ok({
      total: totalRes.count ?? 0,
      first_this_month: firstRes.count ?? 0,
    });
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

// =============================================================================
// fetchMemberHistory
// =============================================================================

/**
 * 詳細 sheet の参加履歴。`member_history_view` を member_id でフィルタ取得。
 */
export async function fetchMemberHistory(
  memberId: MemberId,
): Promise<Result<MemberHistoryRow[], FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("member_history_view")
      .select(
        "reservation_id, member_id, event_id, event_name, start_at, venue_name, status, guest_count, checked_in_at, is_first_time",
      )
      .eq("member_id", memberId as unknown as string)
      .order("start_at", { ascending: false });
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok((data ?? []) as MemberHistoryRow[]);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

/**
 * 詳細 sheet ヘッダー用に当該 member 行を 1 件取得する。
 */
export async function fetchMemberListRowById(
  memberId: MemberId,
): Promise<Result<MemberListRow | null, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("member_list_view")
      .select(
        "id, display_name, email, experience_level, admin_note, created_at, first_attended_at, attended_count, last_attended_at, correction_request_count",
      )
      .eq("id", memberId as unknown as string)
      .maybeSingle();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok((data ?? null) as MemberListRow | null);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

// =============================================================================
// fetchMemberCorrectionRequests
// =============================================================================

/**
 * #296 詳細 sheet の修正依頼セクションが、対象 member の未対応 correction_requests
 * 一覧を取得するための関数。`members.profile->correction_requests` jsonb 配列を返す。
 * member_list_view は count のみを返すため、実エントリ取得には別経路を取る。
 */
export async function fetchMemberCorrectionRequests(
  memberId: MemberId,
): Promise<Result<CorrectionRequest[], FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("members")
      .select("profile")
      .eq("id", memberId as unknown as string)
      .maybeSingle();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    if (data === null || data === undefined) {
      return ok([]);
    }
    return ok(getCorrectionRequests((data.profile ?? {}) as MemberProfile));
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "SERVER_ERROR", message });
  }
}

// =============================================================================
// updateMemberAdminNote
// =============================================================================

/**
 * `members.admin_note` を UPDATE する。空文字は NULL に正規化。
 * 非 admin は RLS WITH CHECK で拒否される (rls-policies capability)。
 */
export async function updateMemberAdminNote(
  memberId: MemberId,
  note: string | null,
): Promise<Result<void, FetchError>> {
  const supabase = getSupabase();
  const normalized = note === null || note.trim().length === 0 ? null : note;
  try {
    const { error } = await supabase
      .from("members")
      .update({ admin_note: normalized })
      .eq("id", memberId as unknown as string);
    if (error) {
      return err({ code: classifyError(error), message: error.message });
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
