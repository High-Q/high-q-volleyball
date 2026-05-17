import { describe, expect, it } from "vitest";
import { redactPII } from "./redactPII.js";
import type { SentryEvent } from "./types.js";

describe("redactPII", () => {
  it("extra のキー名 denylist 値を [REDACTED] に置換", () => {
    const ev: SentryEvent = {
      extra: {
        email: "user@example.com",
        name: "Taro Yamada",
        phone: "090-1234-5678",
        password: "secret123",
        token: "abc.def.ghi",
        safe_field: "keep-me",
      },
    };
    const out = redactPII(ev);
    expect(out.extra?.["email"]).toBe("[REDACTED]");
    expect(out.extra?.["name"]).toBe("[REDACTED]");
    expect(out.extra?.["phone"]).toBe("[REDACTED]");
    expect(out.extra?.["password"]).toBe("[REDACTED]");
    expect(out.extra?.["token"]).toBe("[REDACTED]");
    expect(out.extra?.["safe_field"]).toBe("keep-me");
  });

  it("request.headers の Authorization / Cookie を除去", () => {
    const ev: SentryEvent = {
      request: {
        headers: {
          Authorization: "Bearer abc",
          Cookie: "sess=xyz",
          "X-Request-Id": "rid-1",
        },
      },
    };
    const out = redactPII(ev);
    expect(out.request?.headers?.["Authorization"]).toBe("[REDACTED]");
    expect(out.request?.headers?.["Cookie"]).toBe("[REDACTED]");
    expect(out.request?.headers?.["X-Request-Id"]).toBe("rid-1");
  });

  it("request.cookies を一括 redact", () => {
    const ev: SentryEvent = {
      request: { cookies: { sb: "xyz" } },
    };
    expect(redactPII(ev).request?.cookies).toBe("[REDACTED]");
  });

  it("user.email / user.username を削除し id のみ保持", () => {
    const ev: SentryEvent = {
      user: { id: "uuid-1", email: "u@x", username: "taro" },
    };
    expect(redactPII(ev).user).toEqual({ id: "uuid-1" });
  });

  it("user.id が無ければ空オブジェクト", () => {
    const ev: SentryEvent = { user: { email: "u@x" } };
    expect(redactPII(ev).user).toEqual({});
  });

  it("ネストしたオブジェクトも再帰的に redact", () => {
    const ev: SentryEvent = {
      contexts: {
        request: {
          body: { email: "u@x", id: "keep" },
        },
      },
    };
    const out = redactPII(ev);
    const body = out.contexts?.["request"]?.["body"] as Record<string, unknown>;
    expect(body["email"]).toBe("[REDACTED]");
    expect(body["id"]).toBe("keep");
  });

  it("スタックフレームの URL からクエリ文字列を除去", () => {
    const ev: SentryEvent = {
      exception: {
        values: [
          {
            stacktrace: {
              frames: [
                {
                  filename: "https://x/app.js?token=abc",
                  abs_path: "https://x/app.js?token=abc",
                },
              ],
            },
          },
        ],
      },
    };
    const f = redactPII(ev).exception?.values?.[0]?.stacktrace?.frames?.[0];
    expect(f?.filename).toBe("https://x/app.js");
    expect(f?.abs_path).toBe("https://x/app.js");
  });
});
