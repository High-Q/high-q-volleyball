import { describe, it, expect } from "vitest";
import { readSupabaseConfig, createSupabaseClientSafe } from "./supabase.js";

describe("readSupabaseConfig()", () => {
  it("URL も Publishable key も揃っていれば ok を返す", () => {
    const r = readSupabaseConfig({
      VITE_SUPABASE_URL: "https://abcdefgh.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_dummy",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.url).toBe("https://abcdefgh.supabase.co");
      expect(r.value.publishableKey).toBe("sb_publishable_dummy");
    }
  });

  it("URL 未設定で ENV_MISSING_SUPABASE_URL", () => {
    const r = readSupabaseConfig({
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_dummy",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ENV_MISSING_SUPABASE_URL");
    }
  });

  it("Publishable key 未設定で ENV_MISSING_SUPABASE_PUBLISHABLE_KEY", () => {
    const r = readSupabaseConfig({
      VITE_SUPABASE_URL: "https://abcdefgh.supabase.co",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ENV_MISSING_SUPABASE_PUBLISHABLE_KEY");
    }
  });

  it("URL 形式不正で ENV_INVALID_SUPABASE_URL", () => {
    const r = readSupabaseConfig({
      VITE_SUPABASE_URL: "http://localhost:3000",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_dummy",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("ENV_INVALID_SUPABASE_URL");
    }
  });
});

describe("createSupabaseClientSafe()", () => {
  it("有効な env で SupabaseClient を生成する", () => {
    const r = createSupabaseClientSafe({
      VITE_SUPABASE_URL: "https://abcdefgh.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_dummy",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // 生成された client の最低限のメソッド形が利用可能なこと
      expect(typeof r.value.from).toBe("function");
      expect(typeof r.value.auth).toBe("object");
    }
  });

  it("env 不正なら Result の err を伝播する", () => {
    const r = createSupabaseClientSafe({});
    expect(r.ok).toBe(false);
  });
});
