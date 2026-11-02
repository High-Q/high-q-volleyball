import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PdfDocumentPage } from "./identityDocumentsPdf";

const h = vi.hoisted(() => ({
  drawText: vi.fn(),
  drawImage: vi.fn(),
  embedPng: vi.fn(),
  embedJpg: vi.fn(),
  embedFont: vi.fn(),
  addPage: vi.fn(),
  save: vi.fn(),
}));

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    create: async () => ({
      addPage: h.addPage,
      embedPng: h.embedPng,
      embedJpg: h.embedJpg,
      embedFont: h.embedFont,
      save: h.save,
    }),
  },
  StandardFonts: { Helvetica: "Helvetica" },
}));

beforeEach(() => {
  vi.clearAllMocks();
  h.addPage.mockReturnValue({
    getSize: () => ({ width: 595, height: 842 }),
    drawText: h.drawText,
    drawImage: h.drawImage,
  });
  const img = { scaleToFit: () => ({ width: 100, height: 60 }) };
  h.embedPng.mockResolvedValue(img);
  h.embedJpg.mockResolvedValue(img);
  h.embedFont.mockResolvedValue({});
  h.save.mockResolvedValue(new Uint8Array([1, 2, 3]));
});

const jpgImg = { bytes: new Uint8Array([0xff, 0xd8, 0xff]), format: "jpg" as const };
const pngImg = { bytes: new Uint8Array([0x89, 0x50]), format: "png" as const };

describe("buildIdentityDocumentsPdf", () => {
  it("書類件数ぶんのページを作る", async () => {
    const { buildIdentityDocumentsPdf } = await import("./identityDocumentsPdf");
    const pages: PdfDocumentPage[] = [
      { documentTypeLabel: "drivers_license", images: [jpgImg] },
      { documentTypeLabel: "passport", images: [pngImg] },
    ];
    await buildIdentityDocumentsPdf(pages);
    expect(h.addPage).toHaveBeenCalledTimes(2);
  });

  it("jpg は embedJpg / png は embedPng を使い分ける", async () => {
    const { buildIdentityDocumentsPdf } = await import("./identityDocumentsPdf");
    await buildIdentityDocumentsPdf([
      { documentTypeLabel: "drivers_license", images: [jpgImg, pngImg] },
    ]);
    expect(h.embedJpg).toHaveBeenCalledTimes(1);
    expect(h.embedPng).toHaveBeenCalledTimes(1);
    expect(h.drawImage).toHaveBeenCalledTimes(2);
  });

  it("ラベルは ASCII の 'No.N  種別' で日本語を含まない", async () => {
    const { buildIdentityDocumentsPdf } = await import("./identityDocumentsPdf");
    await buildIdentityDocumentsPdf([
      { documentTypeLabel: "drivers_license", images: [jpgImg] },
    ]);
    const labelArg = h.drawText.mock.calls[0]?.[0] as string;
    expect(labelArg).toBe("No.1  drivers_license");
    // 日本語（CJK）を含まない
    expect(/[　-鿿]/.test(labelArg)).toBe(false);
  });

  it("保存結果の Uint8Array を返す", async () => {
    const { buildIdentityDocumentsPdf } = await import("./identityDocumentsPdf");
    const out = await buildIdentityDocumentsPdf([
      { documentTypeLabel: "passport", images: [pngImg] },
    ]);
    expect(out).toBeInstanceOf(Uint8Array);
    expect(h.save).toHaveBeenCalled();
  });

  it("画像ゼロでも 0 件ページは作らない（空入力は 0 ページ）", async () => {
    const { buildIdentityDocumentsPdf } = await import("./identityDocumentsPdf");
    await buildIdentityDocumentsPdf([]);
    expect(h.addPage).not.toHaveBeenCalled();
  });
});
