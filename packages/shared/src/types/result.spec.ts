import { describe, it, expect } from "vitest";
import { ok, err, appError, type Result } from "./result.js";

describe("Result", () => {
  describe("ok()", () => {
    it("成功値をラップする", () => {
      const r = ok(42);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value).toBe(42);
      }
    });

    it("オブジェクトもラップできる", () => {
      const r = ok({ id: "abc", name: "test" });
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.value).toEqual({ id: "abc", name: "test" });
      }
    });
  });

  describe("err()", () => {
    it("AppError をラップする", () => {
      const r = err(appError("TEST_CODE", "test message"));
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe("TEST_CODE");
        expect(r.error.message).toBe("test message");
      }
    });
  });

  describe("appError()", () => {
    it("cause が undefined のとき cause プロパティを含めない", () => {
      const e = appError("CODE", "msg");
      expect(e).toEqual({ code: "CODE", message: "msg" });
      expect("cause" in e).toBe(false);
    });

    it("cause が指定されたら保持する", () => {
      const original = new Error("original");
      const e = appError("CODE", "msg", original);
      expect(e.cause).toBe(original);
    });
  });

  describe("型ナローイング", () => {
    it("ok 分岐後は value 型が確定する", () => {
      const r: Result<number> = ok(1);
      if (r.ok) {
        // value は number 型として扱える（コンパイル時に検証されることを期待）
        const doubled: number = r.value * 2;
        expect(doubled).toBe(2);
      }
    });
  });
});
