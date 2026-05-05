import { type Result, ok, err } from "@high-q/shared";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type { ApproveErrorCode } from "@/entities/identity-document";

/**
 * identity_documents の status を 'approved' に UPDATE する mutation。
 *
 * 二重承認防御 (design D11):
 *   WHERE status='pending' を含めることで、先着 1 件のみが UPDATE 成功する。
 *   後着 admin の UPDATE は 0 行更新となり ALREADY_REVIEWED として返す。
 *
 * RLS: admin は identity_documents 全件 UPDATE 可能 (rls-policies spec)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 承認アクション)
 *   openspec/changes/admin-identity-document-review/design.md (D7, D11)
 */

export interface ApproveError {
  code: ApproveErrorCode;
  message: string;
}

export async function approveIdentityDocument(
  documentId: IdentityDocumentId,
  adminMemberId: MemberId,
): Promise<Result<void, ApproveError>> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("identity_documents")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminMemberId,
    })
    .eq("id", documentId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    return err({
      code: "DB_FAILED",
      message: error.message,
    });
  }

  // WHERE 句で 0 行更新 → 既に他 admin が処理済 (status != 'pending')
  if (!data || data.length === 0) {
    return err({
      code: "ALREADY_REVIEWED",
      message: "既に他の管理者が処理しました",
    });
  }

  return ok(undefined);
}
