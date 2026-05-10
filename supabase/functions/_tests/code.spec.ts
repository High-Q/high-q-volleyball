import { describe, expect, it } from "vitest";
import { generateSixDigitCode, hashCode, verifyCode } from "../_shared/code.ts";

describe("generateSixDigitCode", () => {
  it("常に 6 桁の数字文字列を返す", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateSixDigitCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    }
  });

  it("先頭ゼロを含むコードもゼロ埋めで 6 桁返る", () => {
    // 多数試行して先頭が 0 のコードが少なくとも 1 件出ること（10% 程度の確率なので 200 回で十分）
    let zeroPrefixCount = 0;
    for (let i = 0; i < 200; i++) {
      const code = generateSixDigitCode();
      if (code.startsWith("0")) zeroPrefixCount++;
      expect(code.length).toBe(6);
    }
    expect(zeroPrefixCount).toBeGreaterThan(0);
  });

  it("十分な分散があり、同じコードが連続して出ない", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateSixDigitCode());
    }
    // 100 回試行で重複があっても 95 種類以上は出るはず（誕生日問題でも稀に重複は出る）
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("hashCode + verifyCode", () => {
  it("同じコードのハッシュは一致する（決定的）", async () => {
    const h1 = await hashCode("123456");
    const h2 = await hashCode("123456");
    expect(h1).toBe(h2);
  });

  it("ハッシュは SHA-256 の 64 文字 hex", async () => {
    const h = await hashCode("123456");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("異なるコードは異なるハッシュ", async () => {
    const h1 = await hashCode("123456");
    const h2 = await hashCode("123457");
    expect(h1).not.toBe(h2);
  });

  it("verifyCode は正しいコードで true", async () => {
    const h = await hashCode("123456");
    expect(await verifyCode("123456", h)).toBe(true);
  });

  it("verifyCode は誤コードで false", async () => {
    const h = await hashCode("123456");
    expect(await verifyCode("999999", h)).toBe(false);
  });

  it("verifyCode は長さが異なる入力で false", async () => {
    const h = await hashCode("123456");
    expect(await verifyCode("12345", h)).toBe(false);
  });
});
