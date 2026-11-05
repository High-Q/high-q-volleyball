import type { ImageFormat } from "./imageFormat";

/**
 * #172 本人確認書類 PDF ビルダ。`pdf-lib` を dynamic import してメインバンドルに含めない。
 *
 * - 承認済み書類 1 件 = 1 ページ。ページ上部に ASCII ラベル（通し番号 + 英語書類種別）のみ。
 * - 日本語テキストは描画しない（pdf-lib 標準フォントが CJK 非対応）。氏名は書類画像自体で突合。
 * - 表面 → 裏面の順に画像を縦配置。jpg は embedJpg / png は embedPng。
 * - ページ順は呼び出し側（オーケストレーション）が CSV 会員行順で渡す。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-bulk-export/specs/admin-identity-document-export/spec.md
 *   同 design.md (D2)
 */
export interface PdfPageImage {
  bytes: Uint8Array;
  format: ImageFormat;
}

export interface PdfDocumentPage {
  /** 英語（ASCII）の書類種別ラベル。日本語を渡してはならない。 */
  documentTypeLabel: string;
  /** 表 → 裏 の順の画像。1 枚以上を想定（空ページは呼び出し側で作らない）。 */
  images: PdfPageImage[];
}

const PAGE_MARGIN = 40;
const LABEL_SIZE = 12;
const LABEL_GAP = 20;
const IMAGE_GAP = 16;

export async function buildIdentityDocumentsPdf(
  pages: PdfDocumentPage[],
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  let index = 0;
  for (const entry of pages) {
    index += 1;
    const page = pdf.addPage();
    const { width, height } = page.getSize();

    // ASCII ラベルのみ（例: "No.1  drivers_license"）
    page.drawText(`No.${index}  ${entry.documentTypeLabel}`, {
      x: PAGE_MARGIN,
      y: height - PAGE_MARGIN,
      size: LABEL_SIZE,
      font,
    });

    // 画像を縦に積む。最大 2 枚（表裏）想定で利用領域を等分する。
    const usableWidth = width - PAGE_MARGIN * 2;
    const usableHeight = height - PAGE_MARGIN * 2 - LABEL_GAP;
    const slotHeight =
      entry.images.length > 0
        ? (usableHeight - IMAGE_GAP * (entry.images.length - 1)) /
          entry.images.length
        : usableHeight;

    let cursorY = height - PAGE_MARGIN - LABEL_GAP;
    for (const img of entry.images) {
      const embedded =
        img.format === "png"
          ? await pdf.embedPng(img.bytes)
          : await pdf.embedJpg(img.bytes);
      const scaled = embedded.scaleToFit(usableWidth, slotHeight);
      cursorY -= scaled.height;
      page.drawImage(embedded, {
        x: PAGE_MARGIN,
        y: cursorY,
        width: scaled.width,
        height: scaled.height,
      });
      cursorY -= IMAGE_GAP;
    }
  }

  return pdf.save();
}
