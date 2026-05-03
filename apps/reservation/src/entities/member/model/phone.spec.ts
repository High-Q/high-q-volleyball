import { describe, it, expect } from "vitest";
import { createPhone } from "./phone";

describe("createPhone", () => {
  it("空文字でエラー（必須項目）", () => {
    expect(() => createPhone("")).toThrow(/電話番号/);
  });

  it("空白のみでエラー", () => {
    expect(() => createPhone("   ")).toThrow(/電話番号/);
  });

  it("固定電話（03-XXXX-XXXX）でエラー", () => {
    expect(() => createPhone("03-1234-5678")).toThrow(/携帯電話/);
  });

  it("桁数不足でエラー", () => {
    expect(() => createPhone("090-1234")).toThrow(/桁数/);
  });

  it("数字以外を含むとエラー", () => {
    expect(() => createPhone("090-abcd-5678")).toThrow();
  });

  it("ハイフン付き携帯番号で正常（070/080/090）", () => {
    expect(createPhone("090-1234-5678")).toBe("090-1234-5678");
    expect(createPhone("080-1234-5678")).toBe("080-1234-5678");
    expect(createPhone("070-1234-5678")).toBe("070-1234-5678");
  });

  it("ハイフンなしを正規化", () => {
    expect(createPhone("09012345678")).toBe("090-1234-5678");
  });

  it("全角数字を半角に正規化", () => {
    expect(createPhone("０９０-１２３４-５６７８")).toBe("090-1234-5678");
    expect(createPhone("０９０１２３４５６７８")).toBe("090-1234-5678");
  });

  it("国際表記（+81）を国内形式に正規化", () => {
    expect(createPhone("+819012345678")).toBe("090-1234-5678");
    expect(createPhone("+81 90 1234 5678")).toBe("090-1234-5678");
  });

  it("半角スペース・全角ハイフン・括弧を除去", () => {
    expect(createPhone("090 1234 5678")).toBe("090-1234-5678");
    expect(createPhone("090－1234－5678")).toBe("090-1234-5678");
    expect(createPhone("(090)1234-5678")).toBe("090-1234-5678");
  });
});
