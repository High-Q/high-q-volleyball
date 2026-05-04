import { type Result, ok, err, appError } from "@high-q/shared";
import type { IdentityDocumentId } from "@high-q/shared";
import { getSupabase } from "@/shared/api/supabase";
import type {
  IdentityDocumentListRow,
  IdentityDocumentDetail,
  IdentityDocumentsListFilter,
  IdentityDocumentsListResult,
  FetchError,
} from "../model/identityDocument.types";

/**
 * `identity_documents` テーブル + members 軽量 join を fetch する API layer。
 *
 * 取得方法の単一性: Supabase の Foreign Table 暗黙 join で 1 クエリで取得し、
 * クライアント側で identity_documents と members を別クエリして join する実装は禁止
 * (N+1 と RLS 漏れのリスクを回避)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D2, D4, D13)
 */

/**
 * 一覧画面用: identity_documents + members(display_name, email) を取得。
 *
 * 固定ソート規則 (design D2):
 *   1. status='pending' を最上位に固定 (運営の見落とし防止)
 *   2. 同一 status 内では uploaded_at desc (新しい提出が上)
 */
export async function fetchIdentityDocumentsList(
  filter: IdentityDocumentsListFilter,
): Promise<Result<IdentityDocumentsListResult, FetchError>> {
  const supabase = getSupabase();

  let query = supabase
    .from("identity_documents")
    .select(
      "id, member_id, document_type, status, uploaded_at, member:members!identity_documents_member_id_fkey(display_name, email)",
      { count: "exact" },
    );

  if (filter.status !== "all") {
    query = query.eq("status", filter.status);
  }

  if (filter.q.trim().length > 0) {
    // members の display_name / email への部分一致 (URL エンコード済の q を直接使用)
    const escaped = filter.q.replace(/[%_]/g, "");
    query = query.or(
      `display_name.ilike.%${escaped}%,email.ilike.%${escaped}%`,
      { foreignTable: "members" },
    );
  }

  // ソート: pending 優先度 + uploaded_at desc (PostgreSQL では複数 order を順に重ねる)
  // pending 優先は status の特殊な順序が必要だが、Supabase の order は単純な ASC/DESC のみ。
  // 'pending' < 'approved' < 'rejected' のアルファベット順を利用すると pending → approved → rejected で
  // pending が最初に来る (ASC)。ただし実際の値: 'approved' < 'pending' < 'rejected' (ASC) で
  // approved が先頭に来てしまう。
  // 解決: クライアント側で全件取得後ソート、または PostgreSQL の CASE 式を使う。
  // 簡略化: status='pending' 単独フィルタが運用デフォルトのため、status フィルタが all のみで
  //          特殊ソートが必要。 'all' のときは uploaded_at desc のみ + クライアント側で
  //          pending 最上位ソートを再適用する。
  query = query.order("uploaded_at", { ascending: false });

  const offset = (filter.page - 1) * filter.per;
  const { data, error, count } = await query.range(
    offset,
    offset + filter.per - 1,
  );

  if (error) {
    return err({
      code: "SERVER_ERROR",
      message: error.message,
    });
  }

  const rawRows = (data ?? []) as unknown as Array<
    Omit<IdentityDocumentListRow, "member"> & {
      member: { display_name: string; email: string } | null;
    }
  >;

  // members join が NULL になることは RLS 構成上ありえないが、防御的に空文字で fallback
  let rows: IdentityDocumentListRow[] = rawRows.map((r) => ({
    ...r,
    member: r.member ?? { display_name: "", email: "" },
  }));

  // 'all' フィルタ時のクライアント側 pending 最上位ソート (design D2)
  if (filter.status === "all") {
    rows = [...rows].sort((a, b) => {
      const ap = a.status === "pending" ? 0 : 1;
      const bp = b.status === "pending" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      // 同一 priority 内: uploaded_at desc
      return b.uploaded_at.localeCompare(a.uploaded_at);
    });
  }

  return ok({
    rows,
    total: count ?? 0,
  });
}

/**
 * 詳細画面用: id 指定で identity_documents + members 詳細を取得。
 */
export async function getIdentityDocumentById(
  id: IdentityDocumentId,
): Promise<Result<IdentityDocumentDetail, FetchError>> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("identity_documents")
    .select(
      `id, member_id, document_type, status, rejection_reason,
       storage_path_front, storage_path_back,
       uploaded_at, reviewed_at, reviewed_by,
       member:members!identity_documents_member_id_fkey(display_name, email, birthday, phone, experience_level)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return err({
      code: "SERVER_ERROR",
      message: error.message,
    });
  }

  if (!data) {
    return err({
      code: "NOT_FOUND",
      message: "identity_document not found",
    });
  }

  const raw = data as unknown as Omit<IdentityDocumentDetail, "member"> & {
    member: IdentityDocumentDetail["member"] | null;
  };

  if (!raw.member) {
    return err({
      code: "NOT_FOUND",
      message: "member not found",
    });
  }

  return ok(raw as unknown as IdentityDocumentDetail);
}

/**
 * pending 件数を取得 (TopNav Badge / Dashboard サマリ用)。
 *
 * head=true で count のみ返却 (data ペイロード不要、軽量)。
 */
export async function fetchPendingCount(): Promise<
  Result<number, FetchError>
> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("identity_documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    return err({
      code: "SERVER_ERROR",
      message: error.message,
    });
  }

  return ok(count ?? 0);
}
