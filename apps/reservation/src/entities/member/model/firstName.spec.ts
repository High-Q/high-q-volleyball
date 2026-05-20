import { describe, it, expect } from "vitest";
import { createFirstName } from "./firstName";

describe("createFirstName", () => {
  it("空文字でエラー", () => {
    expect(() => createFirstName("")).toThrow(/名を入力してください/);
  });

  it("空白のみでエラー（trim 後に空）", () => {
    expect(() => createFirstName("   ")).toThrow(/名を入力してください/);
  });

  it("33 文字以上でエラー", () => {
    expect(() => createFirstName("あ".repeat(33))).toThrow(/32 文字以内/);
  });

  it("1〜32 文字で正常", () => {
    expect(createFirstName("美咲")).toBe("美咲");
    expect(createFirstName("a")).toBe("a");
    expect(createFirstName("あ".repeat(32))).toBe("あ".repeat(32));
  });

  it("前後空白は trim される", () => {
    expect(createFirstName("  美咲  ")).toBe("美咲");
  });
});
