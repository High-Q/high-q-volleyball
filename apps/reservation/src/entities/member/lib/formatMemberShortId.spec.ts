import { describe, expect, it } from "vitest";
import { formatMemberShortId } from "./formatMemberShortId";

describe("formatMemberShortId", () => {
  it("UUID の末尾 4 文字を大文字に整形する", () => {
    expect(
      formatMemberShortId("0a8f2d3c-1234-5678-90ab-cdef01234567"),
    ).toBe("ID · 4567");
  });

  it("末尾に英字を含む場合は大文字化する", () => {
    expect(
      formatMemberShortId("00000000-0000-0000-0000-00000000a8f2"),
    ).toBe("ID · A8F2");
  });

  it("空文字なら placeholder を返す", () => {
    expect(formatMemberShortId("")).toBe("ID · ----");
  });

  it("4 文字未満の入力でも全体を大文字化して返す", () => {
    expect(formatMemberShortId("abc")).toBe("ID · ABC");
  });
});
