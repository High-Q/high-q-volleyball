import { describe, expect, it } from "vitest";
import { resolveMemberDisplayName } from "./resolveMemberDisplayName";

describe("resolveMemberDisplayName", () => {
  it("ニックネーム設定済 → ニックネームを返す", () => {
    expect(
      resolveMemberDisplayName({ displayName: "田中 美咲", nickname: "ミサキ" }),
    ).toBe("ミサキ");
  });

  it("ニックネーム NULL → display_name にフォールバック", () => {
    expect(
      resolveMemberDisplayName({ displayName: "田中 美咲", nickname: null }),
    ).toBe("田中 美咲");
  });

  it("ニックネーム空文字 → display_name にフォールバック", () => {
    expect(
      resolveMemberDisplayName({ displayName: "田中 美咲", nickname: "" }),
    ).toBe("田中 美咲");
  });

  it("英字ニックネームもそのまま返す", () => {
    expect(
      resolveMemberDisplayName({ displayName: "Tanaka Misaki", nickname: "Misa" }),
    ).toBe("Misa");
  });
});
