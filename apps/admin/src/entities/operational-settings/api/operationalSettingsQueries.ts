import { type Result, ok, err } from "@high-q/shared";
import type { MemberId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type { OperationalSettings } from "../model/types";

/**
 * operational_settings の取得 / 更新 API layer（member-registration-toggle）。
 *
 * entities/announcement-template/api を手本に `Result<T, FetchError>` で統一する。
 * 読み書きは RLS で admin のみに制限されている。テーブルは 1 行運用（id = true）。
 *
 * 関連:
 *   openspec/changes/member-registration-toggle/specs/admin-operational-settings/spec.md
 *   supabase/migrations/20261115000000_operational_settings.sql
 */

export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED";

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}

interface OperationalSettingsRow {
  member_registration_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

function toSettings(row: OperationalSettingsRow): OperationalSettings {
  return {
    memberRegistrationEnabled: row.member_registration_enabled,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by as MemberId | null,
  };
}

function classifyError(error: { code?: string; message: string }): FetchErrorCode {
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

const COLUMNS = "member_registration_enabled, updated_at, updated_by";
// 単一行運用: 主キー id は常に true 固定。
const SINGLETON_ID = true;

/**
 * 運営設定（1 行）を取得する。
 */
export async function fetchOperationalSettings(): Promise<
  Result<OperationalSettings, FetchError>
> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("operational_settings")
      .select(COLUMNS)
      .eq("id", SINGLETON_ID)
      .maybeSingle();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    if (!data) {
      // 設定行が無いのは異常系。既定（受付中）で返す。
      return err({ code: "SERVER_ERROR", message: "operational_settings row not found" });
    }
    return ok(toSettings(data as OperationalSettingsRow));
  } catch (cause) {
    return err(toFetchError(cause));
  }
}

/**
 * 新規会員登録の受付可否を更新する。
 */
export async function updateMemberRegistrationEnabled(
  enabled: boolean,
  updatedBy: MemberId,
): Promise<Result<OperationalSettings, FetchError>> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from("operational_settings")
      .update({
        member_registration_enabled: enabled,
        updated_by: updatedBy as unknown as string,
      })
      .eq("id", SINGLETON_ID)
      .select(COLUMNS)
      .single();
    if (error) {
      return err({ code: classifyError(error), message: error.message });
    }
    return ok(toSettings(data as OperationalSettingsRow));
  } catch (cause) {
    return err(toFetchError(cause));
  }
}
