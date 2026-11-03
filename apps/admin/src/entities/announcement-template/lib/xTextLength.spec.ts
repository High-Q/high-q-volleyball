import { describe, expect, it } from "vitest";
import { X_MAX_WEIGHTED, countXWeightedLength } from "./xTextLength";

/**
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *   「X の文字数カウント」
 */
describe("countXWeightedLength", () => {
  it("ASCII は 1", () => {
    expect(countXWeightedLength("abc 123")).toBe(7);
  });

  it("日本語は 2", () => {
    expect(countXWeightedLength("あいう")).toBe(6);
  });

  it("URL は長さによらず 23", () => {
    expect(countXWeightedLength("あいう https://example.com/very/long/path")).toBe(30);
    expect(
      countXWeightedLength("http://a.b https://high-q-volleyball.onrender.com/"),
    ).toBe(23 + 1 + 23);
  });

  it("絵文字は書記素単位で 2（異体字セレクタ・ZWJ 結合も 1 つ）", () => {
    expect(countXWeightedLength("🏐")).toBe(2);
    expect(countXWeightedLength("◾️")).toBe(2);
    expect(countXWeightedLength("👨‍👩‍👧")).toBe(2);
  });

  it("改行は 1", () => {
    expect(countXWeightedLength("a\nb")).toBe(3);
  });

  it("1 として数える記号範囲（— や ’）", () => {
    expect(countXWeightedLength("—’")).toBe(2);
  });

  it("全角記号（〜・／）は 2", () => {
    expect(countXWeightedLength("〜／")).toBe(4);
  });

  it("上限は 280", () => {
    expect(X_MAX_WEIGHTED).toBe(280);
  });
});
