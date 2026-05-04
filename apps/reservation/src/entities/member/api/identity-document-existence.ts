import { getSupabase } from "@/shared/api/supabase";

/**
 * 指定 member の identity_documents が 1 件以上存在するか判定する。
 *
 * RLS により自分の行のみが返るため、自身の存在判定として安全に使える。
 * useAuthSession の `evaluate()` で member fetch と並行で呼び出される。
 *
 * 関連:
 *   openspec/changes/reservation-identity-document-upload/specs/reservation-member-auth/spec.md
 *     (会員プロフィールの取得とキャッシュ)
 */
export async function fetchHasIdentityDocument(uid: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("identity_documents")
    .select("id")
    .eq("member_id", uid)
    .limit(1);
  if (error) {
    throw error;
  }
  return Array.isArray(data) && data.length > 0;
}
