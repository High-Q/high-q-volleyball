import {
  type Result,
  ok,
  err,
  type CorrectionField,
  type CorrectionRequest,
  type MemberId,
  type MemberProfile,
  appendCorrectionRequest,
  getCorrectionRequests,
} from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";

/**
 * #296 admin が会員に修正依頼を作成する mutation。
 *
 * - members.profile を SELECT → JS で append → UPDATE の 2 ステップ
 * - 同 field の既存エントリがある場合は ALREADY_EXISTS で拒否
 * - message は 1〜500 文字、超過 / 空は INVALID_MESSAGE
 *
 * 関連:
 *   openspec/specs/member-correction-requests/spec.md
 *     (Requirement: admin による修正依頼の作成)
 */

export type CreateCorrectionRequestErrorCode =
  | "INVALID_MESSAGE"
  | "ALREADY_EXISTS"
  | "MEMBER_NOT_FOUND"
  | "DB_FAILED"
  | "NETWORK_ERROR";

export interface CreateCorrectionRequestError {
  code: CreateCorrectionRequestErrorCode;
  message: string;
}

export interface CreateCorrectionRequestInput {
  memberId: MemberId;
  adminMemberId: MemberId;
  field: CorrectionField;
  message: string;
}

const MESSAGE_MIN = 1;
const MESSAGE_MAX = 500;

export async function createCorrectionRequest(
  input: CreateCorrectionRequestInput,
): Promise<Result<CorrectionRequest, CreateCorrectionRequestError>> {
  const trimmed = input.message.trim();
  if (trimmed.length < MESSAGE_MIN || trimmed.length > MESSAGE_MAX) {
    return err({
      code: "INVALID_MESSAGE",
      message: `理由は ${MESSAGE_MIN}〜${MESSAGE_MAX} 文字で入力してください`,
    });
  }

  const supabase = getSupabase();
  try {
    const { data: existing, error: fetchError } = await supabase
      .from("members")
      .select("profile")
      .eq("id", input.memberId as unknown as string)
      .maybeSingle();
    if (fetchError) {
      return err({ code: "DB_FAILED", message: fetchError.message });
    }
    if (existing === null || existing === undefined) {
      return err({ code: "MEMBER_NOT_FOUND", message: "会員が見つかりません" });
    }

    const currentProfile = (existing.profile ?? {}) as MemberProfile;
    if (getCorrectionRequests(currentProfile).some((r) => r.field === input.field)) {
      return err({
        code: "ALREADY_EXISTS",
        message: "既に同じ属性の修正依頼が存在します。先に取り下げてください",
      });
    }

    const entry: CorrectionRequest = {
      field: input.field,
      message: trimmed,
      requested_at: new Date().toISOString(),
      requested_by: input.adminMemberId as unknown as string,
    };
    const nextProfile = appendCorrectionRequest(currentProfile, entry);

    const { error: updateError } = await supabase
      .from("members")
      .update({ profile: nextProfile })
      .eq("id", input.memberId as unknown as string);
    if (updateError) {
      return err({ code: "DB_FAILED", message: updateError.message });
    }
    return ok(entry);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "DB_FAILED", message });
  }
}
