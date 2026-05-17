import { describe, expect, it } from "vitest";
import { buildBeforeSend } from "./beforeSend.js";
import type { SentryEvent } from "./types.js";

const baseOpts = { projectName: "admin", random: () => 0 };

describe("buildBeforeSend", () => {
  it("PII を redact してから project_name タグを付与", () => {
    const beforeSend = buildBeforeSend(baseOpts);
    const ev: SentryEvent = {
      __http_status: 500,
      extra: { email: "u@x" },
    };
    const out = beforeSend(ev);
    expect(out?.extra?.["email"]).toBe("[REDACTED]");
    expect(out?.tags?.["project_name"]).toBe("admin");
    expect(out?.level).toBe("error");
  });

  it("isSuppressed が true なら null を返す", () => {
    const beforeSend = buildBeforeSend({
      ...baseOpts,
      isSuppressed: () => true,
    });
    expect(beforeSend({ __http_status: 500 })).toBeNull();
  });

  it("info level + サンプリング外なら null", () => {
    const beforeSend = buildBeforeSend({ projectName: "lp", random: () => 0.99 });
    const ev: SentryEvent = {
      message: "ResizeObserver loop limit exceeded",
    };
    expect(beforeSend(ev)).toBeNull();
  });

  it("info level + サンプリング内なら送出", () => {
    const beforeSend = buildBeforeSend({ projectName: "lp", random: () => 0 });
    const ev: SentryEvent = {
      message: "ResizeObserver loop limit exceeded",
    };
    const out = beforeSend(ev);
    expect(out?.level).toBe("info");
    expect(out?.fingerprint).toEqual(["known-noise", "resize-observer-loop"]);
  });

  it("401 は warning に書き換わり fingerprint tag が付く", () => {
    const beforeSend = buildBeforeSend({ projectName: "admin", random: () => 0 });
    const ev: SentryEvent = { __http_status: 401, __endpoint: "/api/me" };
    const out = beforeSend(ev);
    expect(out?.level).toBe("warning");
    expect(out?.fingerprint).toEqual(["auth-denied", "401", "/api/me"]);
    expect(out?.tags?.["fingerprint_category"]).toBe("auth-denied");
    expect(out?.tags?.["project_name"]).toBe("admin");
  });
});
