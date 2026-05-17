import { describe, expect, it } from "vitest";
import {
  applyStatusMapping,
  mapStatusToLevelAndFingerprint,
} from "./mapStatus.js";
import type { SentryEvent } from "./types.js";

describe("mapStatusToLevelAndFingerprint", () => {
  it("401 → warning + auth-denied:401:<endpoint>", () => {
    const ev: SentryEvent = {
      __http_status: 401,
      __endpoint: "/api/me",
    };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({
      level: "warning",
      fingerprint: ["auth-denied", "401", "/api/me"],
    });
  });

  it("403 → warning + auth-denied:403:<endpoint>", () => {
    const ev: SentryEvent = { __http_status: 403, __endpoint: "/api/x" };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({
      level: "warning",
      fingerprint: ["auth-denied", "403", "/api/x"],
    });
  });

  it("404 → info + not-found:<endpoint>", () => {
    const ev: SentryEvent = { __http_status: 404, __endpoint: "/api/x" };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({
      level: "info",
      fingerprint: ["not-found", "/api/x"],
    });
  });

  it("400 → info + validation", () => {
    const ev: SentryEvent = { __http_status: 400, __endpoint: "/api/x" };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({
      level: "info",
      fingerprint: ["validation", "/api/x"],
    });
  });

  it("422 → info + validation", () => {
    const ev: SentryEvent = { __http_status: 422, __endpoint: "/api/x" };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({
      level: "info",
      fingerprint: ["validation", "/api/x"],
    });
  });

  it("418（その他 4xx）→ warning + client-error", () => {
    const ev: SentryEvent = { __http_status: 418, __endpoint: "/api/teapot" };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({
      level: "warning",
      fingerprint: ["client-error", "418", "/api/teapot"],
    });
  });

  it("503 → error", () => {
    const ev: SentryEvent = { __http_status: 503 };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({ level: "error" });
  });

  it("network error メッセージ → error + network-error", () => {
    const ev: SentryEvent = {
      exception: { values: [{ value: "TypeError: Failed to fetch" }] },
    };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({
      level: "error",
      fingerprint: ["network-error"],
    });
  });

  it("ResizeObserver loop → info + known-noise:resize-observer-loop", () => {
    const ev: SentryEvent = {
      message: "ResizeObserver loop limit exceeded",
    };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({
      level: "info",
      fingerprint: ["known-noise", "resize-observer-loop"],
    });
  });

  it("Script error. → info + known-noise:cors-script-error", () => {
    const ev: SentryEvent = { message: "Script error." };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({
      level: "info",
      fingerprint: ["known-noise", "cors-script-error"],
    });
  });

  it("status / 既知ノイズに該当しない例外 → デフォルト error", () => {
    const ev: SentryEvent = {
      exception: { values: [{ value: "TypeError: x is not a function" }] },
    };
    expect(mapStatusToLevelAndFingerprint(ev)).toEqual({ level: "error" });
  });
});

describe("applyStatusMapping", () => {
  it("fingerprint を tag に複製する", () => {
    const ev: SentryEvent = { __http_status: 401, __endpoint: "/api/me" };
    const out = applyStatusMapping(ev);
    expect(out.fingerprint).toEqual(["auth-denied", "401", "/api/me"]);
    expect(out.tags?.["fingerprint_category"]).toBe("auth-denied");
    expect(out.tags?.["fingerprint_axis_1"]).toBe("401");
    expect(out.tags?.["fingerprint_axis_2"]).toBe("/api/me");
  });

  it("fingerprint が無い (5xx) ケースでは tags 変更なし", () => {
    const ev: SentryEvent = { __http_status: 500 };
    const out = applyStatusMapping(ev);
    expect(out.fingerprint).toBeUndefined();
    expect(out.tags?.["fingerprint_category"]).toBeUndefined();
    expect(out.level).toBe("error");
  });
});
