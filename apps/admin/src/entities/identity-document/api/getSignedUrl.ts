import { type Result, ok, err } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type { FetchError } from "../model/identityDocument.types";

/**
 * Supabase Storage の `identity-documents` バケットに対する 1 時間有効な signed URL を生成する。
 *
 * 既存 RLS で admin は他人配下のオブジェクトも SELECT 可能、admin の Supabase クライアントから
 * createSignedUrl を呼ぶ。URL 漏洩時のリスク窓口を最小化するため有効期限は 1 時間に制限。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/design.md (D6)
 *   openspec/specs/rls-policies/spec.md (Storage バケット identity-documents のアクセスポリシー)
 */

const SIGNED_URL_EXPIRES_SEC = 3600; // 1 時間

export async function getSignedUrl(
  path: string,
): Promise<Result<string, FetchError>> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from("identity-documents")
    .createSignedUrl(path, SIGNED_URL_EXPIRES_SEC);

  if (error || !data?.signedUrl) {
    return err({
      code: "SERVER_ERROR",
      message: error?.message ?? "failed to create signed URL",
    });
  }

  return ok(data.signedUrl);
}
