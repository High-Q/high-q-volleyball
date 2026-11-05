import { describe, expect, it } from "vitest";
import { detectImageFormat } from "./imageFormat";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

describe("detectImageFormat", () => {
  it("PNG マジックバイトを png と判定", () => {
    expect(detectImageFormat(png, "x.bin")).toBe("png");
  });

  it("JPEG マジックバイトを jpg と判定", () => {
    expect(detectImageFormat(jpeg, "x.bin")).toBe("jpg");
  });

  it("マジックバイトがマジックを優先し拡張子より強い", () => {
    // 拡張子は png だが中身は JPEG
    expect(detectImageFormat(jpeg, "photo.png")).toBe("jpg");
  });

  it("マジックが無いときは拡張子で補完（.jpeg → jpg）", () => {
    const unknown = new Uint8Array([0x00, 0x01, 0x02]);
    expect(detectImageFormat(unknown, "scan.jpeg")).toBe("jpg");
    expect(detectImageFormat(unknown, "scan.PNG")).toBe("png");
  });

  it("マジックも拡張子も不明なら null", () => {
    const unknown = new Uint8Array([0x00, 0x01, 0x02]);
    expect(detectImageFormat(unknown, "file.gif")).toBeNull();
    expect(detectImageFormat(unknown)).toBeNull();
  });

  it("空バイト列は null", () => {
    expect(detectImageFormat(new Uint8Array([]), null)).toBeNull();
  });
});
