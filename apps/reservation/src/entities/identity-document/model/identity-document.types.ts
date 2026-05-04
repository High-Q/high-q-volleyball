/**
 * Identity document アップロードに関する型定義。
 *
 * - `IdentityDocumentId` / `DocumentType` は `@high-q/shared` の正規定義を再 export する。
 * - `UploadError` / `PageState` / `SlotState` / `SlotData` / `SubmitInput` は
 *   reservation アプリの本機能内部で完結する型として定義する。
 *
 * 関連:
 *   openspec/changes/reservation-identity-document-upload/specs/reservation-identity-document-upload/spec.md
 *   openspec/changes/reservation-identity-document-upload/design.md (D11 / D12)
 */

import type {
  DocumentType as SharedDocumentType,
  IdentityDocumentId as SharedIdentityDocumentId,
} from "@high-q/shared";

export type DocumentType = SharedDocumentType;
export type IdentityDocumentId = SharedIdentityDocumentId;

/**
 * アップロード処理で発生し得る業務 / 技術エラーの 9 分類。
 *
 * - `unsupported_format`: MIME / 拡張子が許容セット外
 * - `file_too_large`: 10MB 超過 (heic 変換後に判定する場合も含む)
 * - `consent_required`: マイナンバー選択時に同意 chkbox 未チェック
 * - `front_required`: 表面ファイルが指定されていない
 * - `back_required`: 書類種別が裏面必須 (在留カード/特別永住者/パスポート) で
 *   裏面ファイルが指定されていない
 * - `storage_failed_front`: 表面の Supabase Storage upload 失敗
 * - `storage_failed_back`: 裏面の Supabase Storage upload 失敗
 * - `db_failed`: identity_documents の INSERT / UPDATE / DELETE 失敗
 * - `network`: 上記に分類できない通信エラー
 */
export type UploadError =
  | "unsupported_format"
  | "file_too_large"
  | "consent_required"
  | "front_required"
  | "back_required"
  | "storage_failed_front"
  | "storage_failed_back"
  | "db_failed"
  | "network";

/** 画面全体 (送信プロセスの段階) */
export type PageState = "empty" | "selecting" | "submitting" | "success";

/** 各スロットの状態 (front 必須 / back 任意で同じ型を使い回す) */
export type SlotState =
  | "empty"
  | "validating"
  | "ready"
  | "uploading"
  | "uploaded"
  | "error";

/** スロットの reactive データ */
export type SlotData = {
  state: SlotState;
  file: File | null;
  /** 0 - 100 (uploading 時の進捗、それ以外は 0) */
  progress: number;
  /** 直近の検証 / upload エラーメッセージ。state='error' のときに設定される */
  errorMessage?: string;
};

/** composable `useUploadIdentityDocument.submit()` 入力 */
export type SubmitInput = {
  documentType: DocumentType;
  frontFile: File;
  backFile?: File;
  /** マイナンバーカード時の個人番号マスク同意。それ以外の書類では無視される */
  consented: boolean;
};
