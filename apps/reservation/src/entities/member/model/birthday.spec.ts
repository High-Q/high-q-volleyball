import { describe, it, expect } from "vitest";
import { createBirthday } from "./birthday";

describe("createBirthday", () => {
  it("未来日でエラー", () => {
    const future = new Date();
    future.setDate(future.getDate() + 1);
    const iso = future.toISOString().slice(0, 10);
    expect(() => createBirthday(iso)).toThrow(/過去/);
  });

  it("100 年超過でエラー", () => {
    expect(() => createBirthday("1900-01-01")).toThrow(/正しくありません/);
  });

  it("不正な ISO 形式でエラー", () => {
    expect(() => createBirthday("not-a-date")).toThrow(/形式/);
    expect(() => createBirthday("2026/05/02")).toThrow(/形式/);
    expect(() => createBirthday("")).toThrow(/形式/);
  });

  it("過去 100 年以内の日付で正常", () => {
    expect(createBirthday("1995-03-15")).toBe("1995-03-15");
    expect(createBirthday("2000-12-31")).toBe("2000-12-31");
  });

  it("今日の日付は許容（今日生まれの 0 歳児を弾かない）", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(createBirthday(today)).toBe(today);
  });
});
