import { type Result, ok, err } from "@high-q/shared";
import type { AnnouncementId, MemberId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import { unsafeAnnouncementId, unsafeMemberId } from "@high-q/shared";
import type { Announcement, AnnouncementWrite } from "../model/types";

/**
 * announcements の CRUD API layer（general-announcements / #395）。
 *
 * entities/venue/api/venueQueries.ts を手本に `Result<T, FetchError>` で統一する。
 * 書き込みは RLS で admin のみに制限されている。一覧は掲載状態を問わず全件返す
 * （admin は RLS で全件参照でき、掲載状態は lib で導出する）。
 *
 * 関連:
 *   openspec/changes/general-announcements/specs/admin-announcements/spec.md
 *   supabase/migrations/20261118000000_announcements.sql
 */

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED"
  // CHECK 制約違反（掲載終了 <= 開始 / 文字数 / audience 不正、23514）
  | "VALIDATION";

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  audience: string;
  publish_start: string;
  publish_end: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  "id, title, body, audience, publish_start, publish_end, created_by, created_at, updated_at";

function toAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: unsafeAnnouncementId(row.id),
    title: row.title,
    body: row.body,
    audience: row.audience as Announcement["audience"],
    publishStart: row.publish_start,
    publishEnd: row.publish_end,
    createdBy: row.created_by === null ? null : unsafeMemberId(row.created_by),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: AnnouncementWrite): Record<string, unknown> {
  return {
    title: input.title,
    body: input.body,
    audience: input.audience,
    publish_start: input.publishStart,
    publish_end: input.publishEnd,
  };
}

function classifyError(error: { code?: string; message: string }): FetchErrorCode {
  if (error.code === "23514") {
    return "VALIDATION";
  }
  if (error.code === "42501" || /permission|row-level security/i.test(error.message)) {
    return "PERMISSION_DENIED";
  }
  return "SERVER_ERROR";
}

function toFetchError(cause: unknown): FetchError {
  if (cause instanceof TypeError) {
    return { code: "NETWORK_ERROR", message: cause.message };
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return { code: "SERVER_ERROR", message };
}

/**
 * 全お知らせを掲載開始の新しい順で取得する（admin 一覧用・掲載状態を問わず全件）。
 */
export async function fetchAnnouncements(): Promise<Result<Announcement[], FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select(COLUMNS)
      .order("publish_start", { ascending: false });
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(((data ?? []) as AnnouncementRow[]).map(toAnnouncement));
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * 新規お知らせを作成する。作成者を記録する。
 */
export async function createAnnouncement(
  input: AnnouncementWrite,
  createdBy: MemberId,
): Promise<Result<Announcement, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("announcements")
      .insert({ ...toRow(input), created_by: createdBy as unknown as string })
      .select(COLUMNS)
      .single();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(toAnnouncement(data as AnnouncementRow));
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * 既存お知らせを更新する（タイトル・本文・出す相手・掲載期間）。
 */
export async function updateAnnouncement(
  id: AnnouncementId,
  input: AnnouncementWrite,
): Promise<Result<Announcement, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("announcements")
      .update(toRow(input))
      .eq("id", id as unknown as string)
      .select(COLUMNS)
      .single();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(toAnnouncement(data as AnnouncementRow));
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * お知らせを削除する。
 */
export async function deleteAnnouncement(
  id: AnnouncementId,
): Promise<Result<void, FetchError>> {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id as unknown as string);
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(undefined);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}
