import { type Result, ok, err } from "@high-q/shared";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  RejectErrorCode,
  ReviewMutationSuccess,
} from "@/entities/identity-document";

/**
 * identity_documents の status を 'rejected' に UPDATE し、
 * 続けて当該 member の active 予約 (reserved / waitlist) を一括 'cancelled' に UPDATE する mutation。
 *
 * 連鎖予約キャンセル (design D23):
 *   - 対象 status: 'reserved' / 'waitlist'
 *   - 除外 status: 'attended' (来場済の事実保持) / 'no_show' / 'cancelled'
 *   - 既存トリガー set_reservations_cancelled_at が cancelled_at を自動設定
 *
 * 二重承認防御 (design D11):
 *   identity_documents UPDATE の WHERE に status='pending' を含む。0 行更新は ALREADY_REVIEWED。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 差し戻しアクション / 連鎖予約キャンセル)
 *   openspec/changes/admin-identity-document-review/design.md (D8, D11, D23)
 */

export interface RejectError {
  code: RejectErrorCode;
  message: string;
}

const MAX_REASON_LENGTH = 500;

export interface RejectInput {
  documentId: IdentityDocumentId;
  adminMemberId: MemberId;
  memberId: MemberId;
  reason: string;
}

export async function rejectIdentityDocument(
  input: RejectInput,
): Promise<Result<ReviewMutationSuccess, RejectError>> {
  const reason = input.reason.trim();
  if (reason.length === 0 || reason.length > MAX_REASON_LENGTH) {
    return err({
      code: "INVALID_REASON",
      message: "理由は 1 〜 500 文字で入力してください",
    });
  }

  const supabase = getSupabase();

  // Step 1: identity_documents UPDATE + members 取得
  const { data: rejectedRows, error: rejectError } = await supabase
    .from("identity_documents")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.adminMemberId,
    })
    .eq("id", input.documentId)
    .eq("status", "pending")
    .select(
      "id, member:members!identity_documents_member_id_fkey(display_name, email)",
    );

  if (rejectError) {
    return err({
      code: "DB_FAILED",
      message: rejectError.message,
    });
  }

  if (!rejectedRows || rejectedRows.length === 0) {
    return err({
      code: "ALREADY_REVIEWED",
      message: "既に他の管理者が処理しました",
    });
  }

  const rejectedRow = rejectedRows[0] as unknown as {
    member: { display_name: string; email: string } | null;
  };
  const memberInfo = rejectedRow.member;
  if (!memberInfo) {
    return err({
      code: "DB_FAILED",
      message: "member 情報が取得できませんでした",
    });
  }

  // Step 2: 連鎖予約キャンセル
  const { data: cancelledRows, error: cancelError } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("member_id", input.memberId)
    .in("status", ["reserved", "waitlist"])
    .select("id");

  if (cancelError) {
    // identity_documents は rejected 化済 / reservations のみ失敗
    return err({
      code: "CANCEL_FAILED_AFTER_REJECT",
      message: cancelError.message,
    });
  }

  const cancelledCount = cancelledRows?.length ?? 0;

  return ok({
    memberEmail: memberInfo.email,
    memberName: memberInfo.display_name,
    cancelledCount,
  });
}
