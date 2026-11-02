import { type Result, ok, err } from "@high-q/shared";
import type { MemberId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  ApprovedDocumentRow,
  FetchError,
} from "../model/identityDocument.types";

/**
 * #172 役所提出用一括エクスポート: 選択会員の**承認済み**本人確認書類を取得する。
 *
 * - `status = 'approved'` かつ `member_id in (選択会員)` で絞り込む。
 * - 表裏の storage path がともに NULL（マスク漏れ削除済みで実体なし）の行は除外する。
 * - members は member_id FK を明示して 1 クエリで join する（reviewed_by との曖昧回避）。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-bulk-export/specs/admin-identity-document-export/spec.md
 *   同 design.md (D1)
 */
export async function fetchApprovedDocumentsByMemberIds(
  memberIds: MemberId[],
): Promise<Result<ApprovedDocumentRow[], FetchError>> {
  // 空選択ではクエリを投げない（`.in('member_id', [])` の無駄打ちを避ける）。
  if (memberIds.length === 0) {
    return ok([]);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("identity_documents")
    .select(
      `id, member_id, document_type, status, uploaded_at,
       storage_path_front, storage_path_back,
       member:members!identity_documents_member_id_fkey(last_name, first_name, display_name, email)`,
    )
    .eq("status", "approved")
    .in("member_id", memberIds as unknown as string[])
    // 表裏いずれかに実体がある行のみ（ともに NULL = マスク漏れ削除済みは除外）
    .or("storage_path_front.not.is.null,storage_path_back.not.is.null");

  if (error) {
    return err({
      code: "SERVER_ERROR",
      message: (error as { message: string }).message,
    });
  }

  return ok((data ?? []) as unknown as ApprovedDocumentRow[]);
}
