import { beforeEach, describe, expect, it, vi } from "vitest";

const heic2anyMock = vi.fn();

vi.mock("heic2any", () => ({
  __esModule: true,
  default: (...args: unknown[]) => heic2anyMock(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

const HEIC_BLOB = new Blob([new Uint8Array([0xff, 0xd8])], {
  type: "image/heic",
});
const JPEG_BLOB = new Blob([new Uint8Array([0xff, 0xd8])], {
  type: "image/jpeg",
});

describe("convertHeicToJpeg", () => {
  it("MIME=image/heic のファイルは jpeg に変換し File を返す", async () => {
    heic2anyMock.mockResolvedValue(JPEG_BLOB);
    const { convertHeicToJpeg } = await import("./convertHeicToJpeg");

    const file = new File([HEIC_BLOB], "IMG_1234.HEIC", { type: "image/heic" });
    const result = await convertHeicToJpeg(file);

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("IMG_1234.jpg");
    expect(heic2anyMock).toHaveBeenCalledWith({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
  });

  it("MIME=image/heif のファイルも変換する", async () => {
    heic2anyMock.mockResolvedValue(JPEG_BLOB);
    const { convertHeicToJpeg } = await import("./convertHeicToJpeg");

    const file = new File([HEIC_BLOB], "photo.HEIF", { type: "image/heif" });
    const result = await convertHeicToJpeg(file);

    expect(result.name).toBe("photo.jpg");
    expect(result.type).toBe("image/jpeg");
  });

  it("MIME 不明でも拡張子 .heic で検出する", async () => {
    heic2anyMock.mockResolvedValue(JPEG_BLOB);
    const { convertHeicToJpeg } = await import("./convertHeicToJpeg");

    const file = new File([HEIC_BLOB], "photo.heic", {
      type: "application/octet-stream",
    });
    const result = await convertHeicToJpeg(file);

    expect(result.name).toBe("photo.jpg");
  });

  it("拡張子 .heif でも検出する", async () => {
    heic2anyMock.mockResolvedValue(JPEG_BLOB);
    const { convertHeicToJpeg } = await import("./convertHeicToJpeg");

    const file = new File([HEIC_BLOB], "photo.HEIF", {
      type: "application/octet-stream",
    });
    const result = await convertHeicToJpeg(file);

    expect(result.name).toBe("photo.jpg");
  });

  it("非 heic ファイルはそのまま返す (heic2any を呼ばない)", async () => {
    const { convertHeicToJpeg } = await import("./convertHeicToJpeg");

    const file = new File([JPEG_BLOB], "photo.jpg", { type: "image/jpeg" });
    const result = await convertHeicToJpeg(file);

    expect(result).toBe(file);
    expect(heic2anyMock).not.toHaveBeenCalled();
  });

  it("heic2any が配列を返した場合は先頭要素を使う (複数ページ対応)", async () => {
    heic2anyMock.mockResolvedValue([JPEG_BLOB]);
    const { convertHeicToJpeg } = await import("./convertHeicToJpeg");

    const file = new File([HEIC_BLOB], "photo.heic", { type: "image/heic" });
    const result = await convertHeicToJpeg(file);

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("photo.jpg");
  });

  it("heic2any が例外を投げると throw する", async () => {
    heic2anyMock.mockRejectedValue(new Error("invalid heic"));
    const { convertHeicToJpeg } = await import("./convertHeicToJpeg");

    const file = new File([HEIC_BLOB], "broken.heic", { type: "image/heic" });
    await expect(convertHeicToJpeg(file)).rejects.toThrow("invalid heic");
  });

  it("isHeicFile: MIME / 拡張子 (大文字小文字無視) で heic を判定", async () => {
    const { isHeicFile } = await import("./convertHeicToJpeg");

    expect(isHeicFile(new File([], "x.heic", { type: "image/heic" }))).toBe(
      true,
    );
    expect(isHeicFile(new File([], "x.HEIC", { type: "image/heic" }))).toBe(
      true,
    );
    expect(isHeicFile(new File([], "x.heif", { type: "image/heif" }))).toBe(
      true,
    );
    expect(
      isHeicFile(new File([], "x.heic", { type: "application/octet-stream" })),
    ).toBe(true);
    expect(isHeicFile(new File([], "x.jpg", { type: "image/jpeg" }))).toBe(
      false,
    );
    expect(isHeicFile(new File([], "x.png", { type: "image/png" }))).toBe(
      false,
    );
  });
});
