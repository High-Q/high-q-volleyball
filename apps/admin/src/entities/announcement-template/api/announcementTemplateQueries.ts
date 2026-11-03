import { type Result, ok, err } from "@high-q/shared";
import type { MemberId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  AnnouncementChannel,
  AnnouncementTemplate,
} from "../model/types";

/**
 * announcement_templates の取得 / 保存 API layer (#386)。
 *
 * entities/venue/api/venueQueries.ts を手本に `Result<T, FetchError>` で統一する。
 * 読み書きは RLS で admin のみに制限されている。
 *
 * 関連:
 *   openspec/changes/line-announcement-copy/specs/data-schema/spec.md
 *   supabase/migrations/20261029000000_announcement_templates.sql
 */

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED"
  // 本文の CHECK 制約違反（空 / 5,000 文字超, 23514）
  | "INVALID_BODY";

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}

interface AnnouncementTemplateRow {
  channel: AnnouncementChannel;
  body: string;
  updated_at: string;
  updated_by: string | null;
}

function toTemplate(row: AnnouncementTemplateRow): AnnouncementTemplate {
  return {
    channel: row.channel,
    body: row.body,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by as MemberId | null,
  };
}

function classifyError(error: { code?: string; message: string }): FetchErrorCode {
  if (error.code === "23514") {
    return "INVALID_BODY";
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

const COLUMNS = "channel, body, updated_at, updated_by";

/**
 * チャネルのテンプレートを取得する。未登録なら ok(null)。
 */
export async function fetchAnnouncementTemplate(
  channel: AnnouncementChannel,
): Promise<Result<AnnouncementTemplate | null, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("announcement_templates")
      .select(COLUMNS)
      .eq("channel", channel)
      .maybeSingle();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(data ? toTemplate(data as AnnouncementTemplateRow) : null);
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * チャネルのテンプレートを保存する（未登録なら作成、既存なら更新）。
 */
export async function saveAnnouncementTemplate(
  channel: AnnouncementChannel,
  body: string,
  updatedBy: MemberId,
): Promise<Result<AnnouncementTemplate, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("announcement_templates")
      .upsert(
        { channel, body, updated_by: updatedBy as unknown as string },
        { onConflict: "channel" },
      )
      .select(COLUMNS)
      .single();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(toTemplate(data as AnnouncementTemplateRow));
  } catch (cause) {
    return err(toFetchError(cause));
  }
}
