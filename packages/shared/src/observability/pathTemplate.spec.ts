import { describe, expect, it } from "vitest";
import { pathTemplate } from "./pathTemplate.js";

describe("pathTemplate", () => {
  it("UUID を :id に置換する", () => {
    expect(
      pathTemplate(
        "https://x/api/events/3f2504e0-4f89-11d3-9a0c-0305e82c3301"
      )
    ).toBe("/api/events/:id");
  });

  it("数値 ID を :n に置換する", () => {
    expect(pathTemplate("/users/12345/profile")).toBe("/users/:n/profile");
  });

  it("メールアドレスを含むセグメントを :email に置換する", () => {
    expect(pathTemplate("/lookup/foo@bar.com/role")).toBe(
      "/lookup/:email/role"
    );
  });

  it("クエリ文字列を除去する", () => {
    expect(pathTemplate("/lookup?email=foo@bar.com")).toBe("/lookup");
  });

  it("空・undefined を扱う", () => {
    expect(pathTemplate(undefined)).toBe("");
    expect(pathTemplate("")).toBe("");
  });

  it("相対パスでも動く", () => {
    expect(pathTemplate("/api/events/3f2504e0-4f89-11d3-9a0c-0305e82c3301")).toBe(
      "/api/events/:id"
    );
  });
});
