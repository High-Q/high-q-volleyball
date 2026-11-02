import { type Result, ok, err } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  DownloadAuditError,
  IdentityDocumentDownloadInput,
} from "../model/identityDocumentDownload.types";

/**
 * #172 一括ダウンロードの監査ログを 1 行 INSERT する。
 *
 * `member_count` / `document_count` は入力配列の長さから導出して記録し、配列と件数の
 * 整合を保証する。RLS（`is_admin()` WITH CHECK）により admin 以外の INSERT は拒否される。
 *
 * 記録タイミング（呼び出し側の責務）: ZIP ビルド完了後・ローカル保存直前。
 * 本関数の失敗はダウンロード成立後の警告（design D8）に用いる。
 */
export async function insertDownloadAudit(
  input: IdentityDocumentDownloadInput,
): Promise<Result<void, DownloadAuditError>> {
  const supabase = getSupabase();
  const payload = {
    downloaded_by: input.downloaded_by,
    member_ids: input.member_ids,
    document_ids: input.document_ids,
    member_count: input.member_ids.length,
    document_count: input.document_ids.length,
    note: input.note ?? null,
  };

  try {
    const { error } = await supabase
      .from("identity_document_downloads")
      .insert(payload);
    if (error) {
      return err({
        code: "DB_FAILED",
        message: (error as { message: string }).message,
      });
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
