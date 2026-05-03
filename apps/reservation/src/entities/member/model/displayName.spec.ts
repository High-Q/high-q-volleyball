import { describe, it, expect } from "vitest";
import { createDisplayName } from "./displayName";

describe("createDisplayName", () => {
  it("空文字でエラー", () => {
    expect(() => createDisplayName("")).toThrow(/お名前/);
  });

  it("空白のみでエラー（trim 後に空）", () => {
    expect(() => createDisplayName("   ")).toThrow(/お名前/);
  });

  it("51 文字以上でエラー", () => {
    expect(() => createDisplayName("あ".repeat(51))).toThrow(/お名前/);
  });

  it("1〜50 文字で正常", () => {
    expect(createDisplayName("田中 美咲")).toBe("田中 美咲");
    expect(createDisplayName("a")).toBe("a");
    expect(createDisplayName("あ".repeat(50))).toBe("あ".repeat(50));
  });

  it("前後空白は trim される", () => {
    expect(createDisplayName("  田中 美咲  ")).toBe("田中 美咲");
  });
});
