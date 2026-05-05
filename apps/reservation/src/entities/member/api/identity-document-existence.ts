import { getSupabase } from "@/shared/api/supabase";

/**
 * 指定 member の identity_documents が 1 件以上 **status='pending' または 'approved'** で
 * 存在するか判定する。
 *
 * status='rejected' の行は **無効な提出物** として除外する (#171 で方針変更):
 *   - 旧 (#92): 行が 1 件以上あれば true (status 不問)
 *   - 新 (#171): pending or approved の行が 1 件以上あれば true
 *
 * これにより admin に差し戻された (rejected 化された) member は再度 `false` 扱いとなり、
 * router guard で `/signup/identity` への再提出フローへ強制誘導される。
 *
 * RLS により自分の行のみが返るため、自身の存在判定として安全に使える。
 * useAuthSession の `evaluate()` で member fetch と並行で呼び出される。
 *
 * 関連:
 *   openspec/changes/reservation-identity-document-upload/specs/reservation-member-auth/spec.md
 *   openspec/changes/admin-identity-document-review/specs/reservation-identity-document-upload/spec.md
 *     (MODIFIED Requirement: AuthSession に hasIdentityDocument)
 *   openspec/changes/admin-identity-document-review/design.md (D24)
 */
export async function fetchHasIdentityDocument(uid: string): Promise<boolean> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("identity_documents")
    .select("id")
    .eq("member_id", uid)
    .in("status", ["pending", "approved"])
    .limit(1);
  if (error) {
    throw error;
  }
  return Array.isArray(data) && data.length > 0;
}
