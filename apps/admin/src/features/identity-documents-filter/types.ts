import type { StatusFilter } from "@/entities/identity-document";

/**
 * /identity-documents のフィルタ・検索・ページの全状態。URL クエリと双方向同期される。
 *
 * デフォルトは pending (未対応) を最上位の運用優先度として扱う (design D2 / D3)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D3)
 */
export interface FilterState {
  status: StatusFilter;
  search: string;
  page: number;
}

export const DEFAULT_FILTER: FilterState = {
  status: "pending",
  search: "",
  page: 1,
};

export const PER_PAGE = 25;
