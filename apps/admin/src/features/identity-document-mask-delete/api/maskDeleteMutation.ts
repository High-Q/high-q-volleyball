import { type Result, ok, err } from "@high-q/shared";
import type { IdentityDocumentId, MemberId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  MaskDeleteErrorCode,
  ReviewMutationSuccess,
} from "@/entities/identity-document";

/**
 * マイナンバーカード画像のマスク漏れを発見した admin が、
 * Storage オブジェクト + DB 列を削除して安全側に倒す mutation。
 *
 * 3 ステップ (design D10, D23):
 *   1. Storage `identity-documents` から storage_path_front + storage_path_back の
 *      オブジェクトを remove() で完全削除
 *   2. identity_documents UPDATE: status='rejected' / storage_path_front=NULL /
 *      storage_path_back=NULL / rejection_reason=固定文言 / reviewed_at / reviewed_by
 *      WHERE id=:id AND status='pending' で二重承認防御
 *   3. 連鎖予約キャンセル: reservations status IN ('reserved', 'waitlist') →
 *      'cancelled' (attended は除外、来場済の事実保持)
 *
 * 各段階の失敗で error code を区別:
 *   - STORAGE_FAILED: Storage 削除失敗 (DB 未更新、再試行可能)
 *   - DB_FAILED_AFTER_STORAGE_DELETE: Storage 削除済 / DB UPDATE 失敗 (不整合、手動復旧)
 *   - ALREADY_REVIEWED: identity_documents の WHERE 句で 0 行更新
 *   - CANCEL_FAILED_AFTER_MASK_DELETE: Storage + DB 削除済 / reservations UPDATE 失敗
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: マスク漏れ即時削除アクション / 連鎖予約キャンセル)
 *   openspec/changes/admin-identity-document-review/design.md (D10, D11, D23)
 */

export interface MaskDeleteError {
  code: MaskDeleteErrorCode;
  message: string;
}

export const MASK_DELETE_FIXED_REASON =
  "個人番号がマスクされていないため削除しました。再提出をお願いします";

export interface MaskDeleteInput {
  documentId: IdentityDocumentId;
  adminMemberId: MemberId;
  memberId: MemberId;
  storagePaths: {
    front: string | null;
    back: string | null;
  };
}

export async function maskDeleteIdentityDocument(
  input: MaskDeleteInput,
): Promise<Result<ReviewMutationSuccess, MaskDeleteError>> {
  const supabase = getSupabase();

  // Step 1: Storage オブジェクト削除 (front + back の存在分のみ)
  const pathsToRemove = [
    input.storagePaths.front,
    input.storagePaths.back,
  ].filter((p): p is string => typeof p === "string" && p.length > 0);

  if (pathsToRemove.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("identity-documents")
      .remove(pathsToRemove);

    if (storageError) {
      return err({
        code: "STORAGE_FAILED",
        message: storageError.message,
      });
    }
  }

  // Step 2: identity_documents UPDATE + members 取得
  const { data: rejectedRows, error: dbError } = await supabase
    .from("identity_documents")
    .update({
      status: "rejected",
      rejection_reason: MASK_DELETE_FIXED_REASON,
      storage_path_front: null,
      storage_path_back: null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.adminMemberId,
    })
    .eq("id", input.documentId)
    .eq("status", "pending")
    .select(
      "id, member:members!identity_documents_member_id_fkey(display_name, email)",
    );

  if (dbError) {
    return err({
      code: "DB_FAILED_AFTER_STORAGE_DELETE",
      message: dbError.message,
    });
  }

  if (!rejectedRows || rejectedRows.length === 0) {
    return err({
      code: "ALREADY_REVIEWED",
      message: "既に他の管理者が処理しました",
    });
  }

  const memberInfo = (
    rejectedRows[0] as unknown as {
      member: { display_name: string; email: string } | null;
    }
  ).member;
  if (!memberInfo) {
    return err({
      code: "DB_FAILED_AFTER_STORAGE_DELETE",
      message: "member 情報が取得できませんでした",
    });
  }

  // Step 3: 連鎖予約キャンセル
  const { data: cancelledRows, error: cancelError } = await supabase
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("member_id", input.memberId)
    .in("status", ["reserved", "waitlist"])
    .select("id");

  if (cancelError) {
    return err({
      code: "CANCEL_FAILED_AFTER_MASK_DELETE",
      message: cancelError.message,
    });
  }

  return ok({
    memberEmail: memberInfo.email,
    memberName: memberInfo.display_name,
    cancelledCount: cancelledRows?.length ?? 0,
  });
}
