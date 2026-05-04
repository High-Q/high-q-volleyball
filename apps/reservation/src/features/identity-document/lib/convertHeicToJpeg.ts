/**
 * heic / heif ファイルをクライアント側で jpeg に変換する純粋関数。
 *
 * - heic2any は dynamic import して、heic ファイル選択時のみダウンロードする
 *   (~500KB のライブラリを通常 jpg/png ユーザーに負担させない)
 * - quality は 0.92 固定 (admin の目視レビューで個人番号マスクの判定に十分)
 * - 拡張子は `.jpg` に正規化、MIME type も `image/jpeg` に置換
 *
 * 関連:
 *   openspec/changes/reservation-identity-document-upload/design.md (D7 / D18)
 *   openspec/changes/reservation-identity-document-upload/specs/reservation-identity-document-upload/spec.md
 */

const HEIC_MIME = new Set(["image/heic", "image/heif"]);
const HEIC_EXT_RE = /\.(heic|heif)$/i;

/**
 * MIME type または拡張子 (大文字小文字無視) から heic/heif を判定する。
 *
 * Android の一部ブラウザでは heic ファイルの MIME を `application/octet-stream`
 * として返すケースがあるため、拡張子フォールバックは必須。
 */
export function isHeicFile(file: File): boolean {
  if (HEIC_MIME.has(file.type)) return true;
  return HEIC_EXT_RE.test(file.name);
}

/**
 * heic / heif の File を jpeg File に変換する。
 * 非 heic は変換せずそのまま返す。
 *
 * @throws heic2any が変換に失敗した場合 (破損ファイル等)
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  const { default: heic2any } = await import("heic2any");
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });

  const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
  const jpegName = file.name.replace(HEIC_EXT_RE, ".jpg");

  return new File([jpegBlob], jpegName, { type: "image/jpeg" });
}
