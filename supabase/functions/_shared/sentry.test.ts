// Edge Function 側 Sentry ラッパの内部ロジック検証。
// `deno test supabase/functions/_shared/sentry.test.ts` で実行可能。
// CI 上では現状 Deno test を走らせていないため、規約整合性の真実の源として置く。

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { __internal } from "./sentry.ts";

const { redact, pathTemplate, mapStatus, parseDsn } = __internal;

Deno.test("redact: PII キーを [REDACTED] にする", () => {
  const out = redact({
    email: "u@x",
    password: "secret",
    safe: "keep",
  }) as Record<string, unknown>;
  assertEquals(out.email, "[REDACTED]");
  assertEquals(out.password, "[REDACTED]");
  assertEquals(out.safe, "keep");
});

Deno.test("pathTemplate: UUID / 数値 / メール置換", () => {
  assertEquals(
    pathTemplate("/api/events/3f2504e0-4f89-11d3-9a0c-0305e82c3301"),
    "/api/events/:id",
  );
  assertEquals(pathTemplate("/users/123/profile"), "/users/:n/profile");
  assertEquals(pathTemplate("/lookup/foo@bar.com"), "/lookup/:email");
});

Deno.test("mapStatus: 401 → warning + auth-denied", () => {
  const r = mapStatus(401, "/api/me", "");
  assertEquals(r.level, "warning");
  assertEquals(r.fingerprint, ["auth-denied", "401", "/api/me"]);
});

Deno.test("mapStatus: 404 → info + not-found", () => {
  const r = mapStatus(404, "/api/x", "");
  assertEquals(r.level, "info");
  assertEquals(r.fingerprint, ["not-found", "/api/x"]);
});

Deno.test("mapStatus: 500 → error デフォルト fingerprint", () => {
  const r = mapStatus(500, "", "");
  assertEquals(r.level, "error");
  assertEquals(r.fingerprint, undefined);
});

Deno.test("mapStatus: ResizeObserver loop → info + known-noise", () => {
  const r = mapStatus(undefined, "", "ResizeObserver loop limit exceeded");
  assertEquals(r.level, "info");
  assertEquals(r.fingerprint, ["known-noise", "resize-observer-loop"]);
});

Deno.test("parseDsn: 標準 DSN を分解", () => {
  const p = parseDsn("https://abc123@o12345.ingest.sentry.io/67890");
  assertEquals(p?.publicKey, "abc123");
  assertEquals(p?.host, "o12345.ingest.sentry.io");
  assertEquals(p?.projectId, "67890");
  assertEquals(p?.protocol, "https");
});
