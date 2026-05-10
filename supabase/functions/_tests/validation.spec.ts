import { describe, expect, it } from "vitest";
import {
  validateSignupPayload,
  validateVerifyPayload,
} from "../_shared/validation.ts";

const validBase = {
  email: "rem@example.com",
  display_name: "レム テスト",
  birthday: "1995-03-15",
  phone: "090-1234-5678",
  experience_level: "beginner",
  nickname: "レム",
  terms_agreed_at: "2026-05-11T10:00:00.000Z",
};

describe("validateSignupPayload", () => {
  it("有効な payload で ok=true、phone は正規化される", () => {
    const r = validateSignupPayload(validBase);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.email).toBe("rem@example.com");
      expect(r.payload.phone).toBe("090-1234-5678");
      expect(r.payload.nickname).toBe("レム");
    }
  });

  it("メール大文字 → 小文字に正規化", () => {
    const r = validateSignupPayload({ ...validBase, email: "REM@Example.COM" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.email).toBe("rem@example.com");
  });

  it("phone 区切りなし → ハイフン正規化", () => {
    const r = validateSignupPayload({ ...validBase, phone: "09012345678" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.phone).toBe("090-1234-5678");
  });

  it("phone 半角空白 → ハイフン正規化", () => {
    const r = validateSignupPayload({ ...validBase, phone: "090 1234 5678" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.phone).toBe("090-1234-5678");
  });

  it("nickname 空文字 → null として保持", () => {
    const r = validateSignupPayload({ ...validBase, nickname: "" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.nickname).toBeNull();
  });

  it("メール空でエラー", () => {
    const r = validateSignupPayload({ ...validBase, email: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.find((e) => e.field === "email")).toBeTruthy();
  });

  it("メール形式不正でエラー", () => {
    const r = validateSignupPayload({ ...validBase, email: "not-email" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.find((e) => e.field === "email")).toBeTruthy();
  });

  it("display_name 空でエラー", () => {
    const r = validateSignupPayload({ ...validBase, display_name: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.find((e) => e.field === "display_name")).toBeTruthy();
  });

  it("display_name 51 文字超でエラー", () => {
    const r = validateSignupPayload({ ...validBase, display_name: "あ".repeat(51) });
    expect(r.ok).toBe(false);
  });

  it("birthday 未来日でエラー", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const r = validateSignupPayload({ ...validBase, birthday: future });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.find((e) => e.field === "birthday")).toBeTruthy();
  });

  it("birthday 100 年以上前でエラー", () => {
    const r = validateSignupPayload({ ...validBase, birthday: "1900-01-01" });
    expect(r.ok).toBe(false);
  });

  it("phone 固定電話（携帯ではない）でエラー", () => {
    const r = validateSignupPayload({ ...validBase, phone: "03-1234-5678" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.find((e) => e.field === "phone")).toBeTruthy();
  });

  it("phone 桁数不足でエラー", () => {
    const r = validateSignupPayload({ ...validBase, phone: "090-1234" });
    expect(r.ok).toBe(false);
  });

  it("experience_level enum 外でエラー", () => {
    const r = validateSignupPayload({ ...validBase, experience_level: "ninja" });
    expect(r.ok).toBe(false);
  });

  it("nickname 16 文字超でエラー", () => {
    const r = validateSignupPayload({ ...validBase, nickname: "あ".repeat(16) });
    expect(r.ok).toBe(false);
  });

  it("nickname 数字含むでエラー", () => {
    const r = validateSignupPayload({ ...validBase, nickname: "たろ123" });
    expect(r.ok).toBe(false);
  });

  it("nickname 記号含むでエラー", () => {
    const r = validateSignupPayload({ ...validBase, nickname: "Taro_san" });
    expect(r.ok).toBe(false);
  });

  it("terms_agreed_at 空でエラー", () => {
    const r = validateSignupPayload({ ...validBase, terms_agreed_at: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.find((e) => e.field === "terms")).toBeTruthy();
  });

  it("payload が object でないと _root エラー", () => {
    const r = validateSignupPayload("not-an-object");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]?.field).toBe("_root");
  });
});

describe("validateVerifyPayload", () => {
  it("有効な email + 6 桁コードで ok=true、email は小文字化", () => {
    const r = validateVerifyPayload({ email: "REM@Example.COM", code: "123456" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.email).toBe("rem@example.com");
      expect(r.code).toBe("123456");
    }
  });

  it("メール形式不正でエラー", () => {
    const r = validateVerifyPayload({ email: "not-email", code: "123456" });
    expect(r.ok).toBe(false);
  });

  it("コード 6 桁未満でエラー", () => {
    const r = validateVerifyPayload({ email: "rem@example.com", code: "12345" });
    expect(r.ok).toBe(false);
  });

  it("コード 7 桁でエラー", () => {
    const r = validateVerifyPayload({ email: "rem@example.com", code: "1234567" });
    expect(r.ok).toBe(false);
  });

  it("コードが数字以外でエラー", () => {
    const r = validateVerifyPayload({ email: "rem@example.com", code: "abcdef" });
    expect(r.ok).toBe(false);
  });

  it("payload が object でないと _root エラー", () => {
    const r = validateVerifyPayload(null);
    expect(r.ok).toBe(false);
  });
});
