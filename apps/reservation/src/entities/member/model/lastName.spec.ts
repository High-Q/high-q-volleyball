import { describe, it, expect } from "vitest";
import { createLastName } from "./lastName";

describe("createLastName", () => {
  it("空文字でエラー", () => {
    expect(() => createLastName("")).toThrow(/姓を入力してください/);
  });

  it("空白のみでエラー（trim 後に空）", () => {
    expect(() => createLastName("   ")).toThrow(/姓を入力してください/);
  });

  it("33 文字以上でエラー", () => {
    expect(() => createLastName("あ".repeat(33))).toThrow(/32 文字以内/);
  });

  it("1〜32 文字で正常", () => {
    expect(createLastName("田中")).toBe("田中");
    expect(createLastName("a")).toBe("a");
    expect(createLastName("あ".repeat(32))).toBe("あ".repeat(32));
  });

  it("前後空白は trim される", () => {
    expect(createLastName("  田中  ")).toBe("田中");
  });
});
