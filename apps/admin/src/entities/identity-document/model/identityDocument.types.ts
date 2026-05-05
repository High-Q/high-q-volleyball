import type {
  IdentityDocumentId,
  MemberId,
  DocumentType,
  IdentityDocumentStatus,
  ExperienceLevel,
} from "@high-q/shared";

/**
 * apps/admin の identity-documents 一覧 / 詳細画面が扱うドメイン型。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D2, D4, D6, D13)
 */

/** 一覧 DataTable の row DTO。members の軽量 join を含む。 */
export interface IdentityDocumentListRow {
  id: IdentityDocumentId;
  member_id: MemberId;
  document_type: DocumentType;
  status: IdentityDocumentStatus;
  uploaded_at: string; // ISO 8601
  member: {
    display_name: string;
    email: string;
  };
}

/** 詳細画面の row DTO。members の詳細 join + storage_path / rejection_reason / 審査情報を含む。 */
export interface IdentityDocumentDetail {
  id: IdentityDocumentId;
  member_id: MemberId;
  document_type: DocumentType;
  status: IdentityDocumentStatus;
  rejection_reason: string | null;
  /** マスク漏れ削除済の場合は NULL (#171 design D10)。 */
  storage_path_front: string | null;
  storage_path_back: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: MemberId | null;
  member: {
    display_name: string;
    email: string;
    birthday: string; // ISO 8601 date
    phone: string | null;
    experience_level: ExperienceLevel;
  };
}

/** 一覧画面のステータスフィルタ。 */
export type StatusFilter = "pending" | "approved" | "rejected" | "all";

/** 一覧 fetch パラメータ。 */
export interface IdentityDocumentsListFilter {
  status: StatusFilter;
  q: string;
  page: number;
  per: number;
}

/** 一覧 fetch 結果。 */
export interface IdentityDocumentsListResult {
  rows: IdentityDocumentListRow[];
  total: number;
}

/** API layer の共通エラーコード。 */
export type FetchErrorCode =
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "PERMISSION_DENIED"
  | "NOT_FOUND";

export interface FetchError {
  code: FetchErrorCode;
  message: string;
}

/** 承認 mutation のエラーコード。 */
export type ApproveErrorCode =
  | "DB_FAILED"
  | "ALREADY_REVIEWED"
  | "NETWORK_ERROR";

/** 差し戻し mutation のエラーコード。 */
export type RejectErrorCode =
  | "INVALID_REASON"
  | "DB_FAILED"
  | "ALREADY_REVIEWED"
  | "CANCEL_FAILED_AFTER_REJECT"
  | "NETWORK_ERROR";

/** マスク漏れ削除 mutation のエラーコード。 */
export type MaskDeleteErrorCode =
  | "STORAGE_FAILED"
  | "DB_FAILED_AFTER_STORAGE_DELETE"
  | "CANCEL_FAILED_AFTER_MASK_DELETE"
  | "ALREADY_REVIEWED"
  | "NETWORK_ERROR";

/** 差し戻し / マスク漏れ削除の成功時に呼び出し側に返す情報。
 *  mailto: body 構築 (memberName / memberEmail) と
 *  キャンセル件数表示 (cancelledCount) に使う。 */
export interface ReviewMutationSuccess {
  memberEmail: string;
  memberName: string;
  cancelledCount: number;
}
