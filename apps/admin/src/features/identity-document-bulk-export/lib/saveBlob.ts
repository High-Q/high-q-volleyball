/**
 * #172 生成した ZIP Blob をブラウザのダウンロードとしてローカル保存する。
 * 外部送信はしない（SOP §3）。テストで差し替えやすいよう薄い関数に分離する。
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** `役所提出_YYYYMMDD.zip` のファイル名を生成する。 */
export function buildZipFilename(asOf: Date): string {
  const y = asOf.getFullYear();
  const m = String(asOf.getMonth() + 1).padStart(2, "0");
  const d = String(asOf.getDate()).padStart(2, "0");
  return `役所提出_${y}${m}${d}.zip`;
}
