import { describe, it, expect } from "vitest";
import { createNickname, validateOptionalNickname } from "./nickname";

describe("createNickname", () => {
  it("ひらがな・カタカナ・漢字・英字の混在で正常", () => {
    expect(createNickname("たろ")).toBe("たろ");
    expect(createNickname("ミサキ")).toBe("ミサキ");
    expect(createNickname("Taro")).toBe("Taro");
    expect(createNickname("タロウ太郎")).toBe("タロウ太郎");
  });

  it("15 文字ちょうどで正常", () => {
    // ひらがな 15 文字
    expect(createNickname("あいうえおかきくけこさしすせそ")).toBe(
      "あいうえおかきくけこさしすせそ",
    );
  });

  it("前後空白は trim される", () => {
    expect(createNickname("  たろ  ")).toBe("たろ");
  });

  it("空文字でエラー", () => {
    expect(() => createNickname("")).toThrow(/ニックネーム/);
  });

  it("空白のみでエラー（trim 後に空）", () => {
    expect(() => createNickname("   ")).toThrow(/ニックネーム/);
  });

  it("16 文字以上でエラー", () => {
    expect(() => createNickname("あ".repeat(16))).toThrow(/15 文字/);
  });

  it("数字を含むとエラー", () => {
    expect(() => createNickname("たろ123")).toThrow(/日本語と英字/);
    expect(() => createNickname("Taro2026")).toThrow(/日本語と英字/);
  });

  it("記号を含むとエラー", () => {
    expect(() => createNickname("たろ★")).toThrow(/日本語と英字/);
    expect(() => createNickname("Taro_san")).toThrow(/日本語と英字/);
    expect(() => createNickname("たろ・ちゃん")).toThrow(/日本語と英字/);
  });

  it("絵文字を含むとエラー", () => {
    expect(() => createNickname("たろ🏐")).toThrow(/日本語と英字/);
    expect(() => createNickname("⭐ミサキ")).toThrow(/日本語と英字/);
  });
});

describe("validateOptionalNickname", () => {
  it("null / undefined は null を返す", () => {
    expect(validateOptionalNickname(null)).toBeNull();
    expect(validateOptionalNickname(undefined)).toBeNull();
  });

  it("空文字は null を返す", () => {
    expect(validateOptionalNickname("")).toBeNull();
  });

  it("空白のみは null を返す", () => {
    expect(validateOptionalNickname("   ")).toBeNull();
  });

  it("値があるときは createNickname と同じ検証を通す", () => {
    expect(validateOptionalNickname("ミサキ")).toBe("ミサキ");
  });

  it("値があり不正なときはエラーを伝播する", () => {
    expect(() => validateOptionalNickname("たろ123")).toThrow(/日本語と英字/);
    expect(() => validateOptionalNickname("あ".repeat(16))).toThrow(/15 文字/);
  });
});
