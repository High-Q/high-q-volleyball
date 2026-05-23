import {
  type Result,
  ok,
  err,
  type CorrectionField,
  type MemberId,
  type MemberProfile,
  removeCorrectionRequests,
} from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";

/**
 * #296 admin が修正依頼を取り下げる mutation。
 *
 * - members.profile を SELECT → JS で該当 field を filter out → UPDATE
 * - 該当エントリが存在しない / 既に消えていても成功扱い (idempotent)
 *
 * 関連:
 *   openspec/specs/member-correction-requests/spec.md
 *     (Requirement: admin による修正依頼の取り下げ)
 */

export type WithdrawCorrectionRequestErrorCode =
  | "MEMBER_NOT_FOUND"
  | "DB_FAILED"
  | "NETWORK_ERROR";

export interface WithdrawCorrectionRequestError {
  code: WithdrawCorrectionRequestErrorCode;
  message: string;
}

export interface WithdrawCorrectionRequestInput {
  memberId: MemberId;
  field: CorrectionField;
}

export async function withdrawCorrectionRequest(
  input: WithdrawCorrectionRequestInput,
): Promise<Result<void, WithdrawCorrectionRequestError>> {
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
    const nextProfile = removeCorrectionRequests(currentProfile, [input.field]);

    const { error: updateError } = await supabase
      .from("members")
      .update({ profile: nextProfile })
      .eq("id", input.memberId as unknown as string);
    if (updateError) {
      return err({ code: "DB_FAILED", message: updateError.message });
    }
    return ok(undefined);
  } catch (cause) {
    if (cause instanceof TypeError) {
      return err({ code: "NETWORK_ERROR", message: cause.message });
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return err({ code: "DB_FAILED", message });
  }
}
