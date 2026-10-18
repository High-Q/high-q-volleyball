/**
 * identity_documents テーブル + identity-documents Storage バケットへの I/O。
 *
 * 振る舞いの詳細は composable (`useUploadIdentityDocument`) でオーケストレーションする。
 * 本ファイルの関数は副作用のみを担当し、状態管理しない。
 *
 * 手順は「Storage 表裏並列 upload → 実パス確定済みで行 INSERT」の順 (design D2)。
 * 行が作られる時点でその storage_path_* が指すオブジェクトは必ず存在するため、
 * 仮パス placeholder → 確定 UPDATE の手順は取らない (#379)。
 *
 * 関連:
 *   openspec/changes/reservation-identity-upload-atomic-path/design.md (D1 / D2 / D3)
 *   openspec/changes/reservation-identity-upload-atomic-path/specs/reservation-identity-document-upload/spec.md
 */

import { getSupabase } from "@/shared/api/supabase";
import type { DocumentType } from "@/entities/identity-document";

export type Side = "front" | "back";

const BUCKET = "identity-documents";
const TABLE = "identity_documents";

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

/**
 * 実パス確定済みで identity_documents 行を 1 回だけ INSERT する。
 * id はクライアント採番 (`crypto.randomUUID()`) 値を明示指定し、storage_path_* には
 * upload 済みの実パスを入れる。行作成後に storage_path を書き換える追加 UPDATE は行わない。
 *
 * 失敗時は Supabase の error オブジェクトを console.error に詳細出力してから throw
 * する (本番デバッグ性の確保)。呼び出し側 (composable) で upload 済みオブジェクトを
 * 撤去する。
 */
export async function insertRecord(params: {
  id: string;
  memberId: string;
  documentType: DocumentType;
  frontPath: string;
  backPath?: string | null;
}): Promise<void> {
  const supabase = getSupabase();
  const payload = {
    id: params.id,
    member_id: params.memberId,
    document_type: params.documentType,
    storage_path_front: params.frontPath,
    storage_path_back: params.backPath ?? null,
    status: "pending",
  };
  const { error } = await supabase.from(TABLE).insert(payload);
  if (error) {
    // 本番で 400 等が出た時に原因を特定できるよう、Supabase error の全フィールドを残す
    // eslint-disable-next-line no-console
    console.error("[#379] identity_documents INSERT failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      payload,
    });
    throw error;
  }
}

/** 失敗時に既に upload された Storage オブジェクトを削除する (best-effort)。 */
export async function removeStorageObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = getSupabase();
  await supabase.storage.from(BUCKET).remove(paths);
}
