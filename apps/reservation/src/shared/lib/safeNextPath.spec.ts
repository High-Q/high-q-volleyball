import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safeNextPath";

describe("safeNextPath", () => {
  describe("受理されるパス", () => {
    it("通常のパスを受理する", () => {
      expect(safeNextPath("/events/abc-123")).toBe("/events/abc-123");
    });

    it("クエリ付きパスを受理する", () => {
      expect(safeNextPath("/events/abc?foo=bar")).toBe("/events/abc?foo=bar");
    });

    it("ハッシュ付きパスを受理する", () => {
      expect(safeNextPath("/history#section")).toBe("/history#section");
    });

    it("ルートパス / を受理する", () => {
      expect(safeNextPath("/")).toBe("/");
    });

    it("プロフィール画面を受理する", () => {
      expect(safeNextPath("/profile")).toBe("/profile");
    });
  });

  describe("却下される URL / パス", () => {
    it("http スキームの絶対 URL を却下する", () => {
      expect(safeNextPath("http://evil.example.com/phish")).toBeNull();
    });

    it("https スキームの絶対 URL を却下する", () => {
      expect(safeNextPath("https://evil.example.com/phish")).toBeNull();
    });

    it("javascript: スキームを却下する", () => {
      expect(safeNextPath("javascript:alert(1)")).toBeNull();
    });

    it("data: スキームを却下する", () => {
      expect(safeNextPath("data:text/html,<script>")).toBeNull();
    });

    it("protocol-relative URL (//) を却下する", () => {
      expect(safeNextPath("//evil.example.com")).toBeNull();
    });

    it("バックスラッシュ混入 (\\evil) を却下する", () => {
      expect(safeNextPath("/\\evil.example.com")).toBeNull();
    });

    it("/ で始まらない相対パスを却下する", () => {
      expect(safeNextPath("events/abc")).toBeNull();
    });

    it("空文字を却下する", () => {
      expect(safeNextPath("")).toBeNull();
    });

    it("改行を含む値を却下する", () => {
      expect(safeNextPath("/events\nevil")).toBeNull();
    });

    it("制御文字 (タブ) を含む値を却下する", () => {
      expect(safeNextPath("/events\tevil")).toBeNull();
    });
  });

  describe("認証導線への循環を却下", () => {
    it("/login を却下する", () => {
      expect(safeNextPath("/login")).toBeNull();
    });

    it("/login?reason=x を却下する", () => {
      expect(safeNextPath("/login?reason=x")).toBeNull();
    });

    it("/signup を却下する", () => {
      expect(safeNextPath("/signup")).toBeNull();
    });

    it("/signup/verify を却下する", () => {
      expect(safeNextPath("/signup/verify")).toBeNull();
    });

    it("/signup/identity を却下する", () => {
      expect(safeNextPath("/signup/identity")).toBeNull();
    });

    it("/auth/callback を却下する", () => {
      expect(safeNextPath("/auth/callback")).toBeNull();
    });

    it("/auth/link-sent を却下する", () => {
      expect(safeNextPath("/auth/link-sent")).toBeNull();
    });
  });

  describe("非文字列入力", () => {
    it("undefined を却下する", () => {
      expect(safeNextPath(undefined)).toBeNull();
    });

    it("null を却下する", () => {
      expect(safeNextPath(null)).toBeNull();
    });

    it("配列を却下する (vue-router の繰り返しクエリ)", () => {
      expect(safeNextPath(["/events", "/profile"])).toBeNull();
    });

    it("数値を却下する", () => {
      expect(safeNextPath(123 as unknown as string)).toBeNull();
    });
  });
});
