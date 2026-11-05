/**
 * #172 PDF 埋め込み用の画像形式判定（純粋関数）。
 *
 * マジックバイトを最優先で判定し、不足時は拡張子で補う。jpg / png のどちらとも
 * 判定できない場合は null（＝埋め込み失敗として結果サマリに記録）。
 * HEIC はアップロード時に jpg 変換済みの前提（design Context）。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-bulk-export/specs/admin-identity-document-export/spec.md
 *   同 design.md (D2)
 */
export type ImageFormat = "jpg" | "png";

function matchesMagic(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_MAGIC = [0xff, 0xd8, 0xff];

export function detectImageFormat(
  bytes: Uint8Array,
  path?: string | null,
): ImageFormat | null {
  // 1. マジックバイト（最も信頼できる）
  if (matchesMagic(bytes, PNG_MAGIC)) return "png";
  if (matchesMagic(bytes, JPEG_MAGIC)) return "jpg";

  // 2. 拡張子フォールバック
  if (path) {
    const lower = path.toLowerCase();
    if (lower.endsWith(".png")) return "png";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "jpg";
  }

  // 3. 判定不能
  return null;
}
