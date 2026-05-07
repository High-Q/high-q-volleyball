import { buildIcs, buildIcsFileName, type BuildIcsInput } from "../lib/build-ics";

/**
 * `.ics` ファイルをクライアント生成 → ブラウザのダウンロード動作で保存させる composable。
 *
 * Blob → URL.createObjectURL → 一時 `<a download>` クリックの DOM 経路で起動する。
 * サーバー API は介在しない (クライアント完結)。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 *     Requirement: カレンダー追加 (.ics ダウンロード)
 */
export function useIcsDownload(): {
  download: (input: BuildIcsInput) => void;
} {
  function download(input: BuildIcsInput): void {
    const ics = buildIcs(input);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildIcsFileName(input.reservationNumber);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return { download };
}
