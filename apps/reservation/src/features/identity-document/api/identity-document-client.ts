/**
 * identity_documents テーブル + identity-documents Storage バケットへの I/O。
 *
 * 振る舞いの詳細は composable (`useUploadIdentityDocument`) でオーケストレーションする。
 * 本ファイルの関数は副作用のみを担当し、状態管理しない。
 *
 * 関連:
 *   openspec/changes/reservation-identity-document-upload/design.md (D8 / D9 / D17)
 *   openspec/changes/reservation-identity-document-upload/specs/reservation-identity-document-upload/spec.md
 */

import { getSupabase } from "@/shared/api/supabase";
import type { DocumentType } from "@/entities/identity-document";

export type Side = "front" | "back";

const BUCKET = "identity-documents";
const TABLE = "identity_documents";

const STORAGE_PATH_PLACEHOLDER = "__pending__";

/**
 * MIME type から保存拡張子を導出する。heic/heif は heic2any で変換済の前提
 * のため jpg にフォールバックする。未知の MIME は jpg をデフォルトとする。
 */
function extFromMime(mime: string): "jpg" | "png" {
  if (mime === "image/png") return "png";
  // image/jpeg / image/heic / image/heif / その他は jpg として保存
  return "jpg";
}

/** Storage パスの組み立て: `<member_id>/<document_id>-<side>.<ext>` */
export function buildStoragePath(
  memberId: string,
  documentId: string,
  side: Side,
  mimeType: string,
): string {
  return `${memberId}/${documentId}-${side}.${extFromMime(mimeType)}`;
}

/**
 * `status='pending'` で identity_documents 行を作成し、生成された ID を返す。
 * `storage_path_front` には placeholder を入れ、Storage upload 後に UPDATE する。
 *
 * 失敗時は Supabase の error オブジェクトを console.error に詳細出力してから throw
 * する (本番デバッグ性の確保。本番でのみ意味のある情報のため、テストは error を
 * throw するかどうかのみ確認する)。
 */
export async function insertPendingRecord(
  memberId: string,
  documentType: DocumentType,
): Promise<string> {
  const supabase = getSupabase();
  const payload = {
    member_id: memberId,
    document_type: documentType,
    storage_path_front: STORAGE_PATH_PLACEHOLDER,
    storage_path_back: null,
    status: "pending",
  };
  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    // 本番で 400 等が出た時に原因を特定できるよう、Supabase error の全フィールドを残す
    // eslint-disable-next-line no-console
    console.error("[#92] identity_documents INSERT failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload,
    });
    throw error;
  }
  if (!data || typeof data.id !== "string") {
    throw new Error("identity_documents INSERT did not return id");
  }
  return data.id;
}

/** 単一ファイルを Supabase Storage に upload する。 */
export async function uploadFileToStorage(
  path: string,
  file: File,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
}

/** 表/裏のパスを identity_documents 行に確定 UPDATE する。 */
export async function confirmStoragePaths(
  documentId: string,
  paths: { front: string; back?: string | null },
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from(TABLE)
    .update({
      storage_path_front: paths.front,
      storage_path_back: paths.back ?? null,
    })
    .eq("id", documentId);
  if (error) throw error;
}

/** Storage upload 失敗時のロールバック (best-effort、エラーは飲み込む)。 */
export async function rollbackRecord(documentId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from(TABLE).delete().eq("id", documentId);
  // 削除エラーは呼び出し側でログするだけ。UI には伝えない
}

/** 失敗時に既に upload された Storage オブジェクトを削除する (best-effort)。 */
export async function removeStorageObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = getSupabase();
  await supabase.storage.from(BUCKET).remove(paths);
}
