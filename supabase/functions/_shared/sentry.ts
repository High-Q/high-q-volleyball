// Sentry HTTP API 直送ラッパー（Edge Function 専用）。
//
// Supabase Edge Functions (Deno) では workspace パッケージを import できないため、
// packages/shared/src/observability/ のコアロジックを最低限複製している。
// テーブル定数（PII denylist / status マッピング / sampling rate）は仕様レベルで
// フロント側と同期させる。差分が発生したらフロント側を真実の源とし手動同期する。
//
// 設計: openspec/changes/add-sentry-error-monitoring/design.md D2 / D6 / D8 / D9
//
// 送信は fire-and-forget。本処理レスポンスをブロックしない。

const DSN = Deno.env.get("SENTRY_DSN");
const ENVIRONMENT = Deno.env.get("SENTRY_ENVIRONMENT") ?? "dev";

type Level = "fatal" | "error" | "warning" | "info";

const PII_KEY_PATTERNS = [
  "email",
  "name",
  "phone",
  "tel",
  "mynumber",
  "my_number",
  "document",
  "password",
  "passwd",
  "token",
  "secret",
  "authorization",
  "cookie",
  "address",
  "zip",
] as const;

const REDACTED = "[REDACTED]";

const LEVEL_SAMPLE_RATES: Record<Level, number> = {
  fatal: 1.0,
  error: 1.0,
  warning: 0.2,
  info: 0.05,
};

function isPIIKey(key: string): boolean {
  const lower = key.toLowerCase();
  return PII_KEY_PATTERNS.some((p) => lower.includes(p));
}

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isPIIKey(k) ? REDACTED : redact(v);
    }
    return out;
  }
  return value;
}

function pathTemplate(url: string | undefined): string {
  if (!url) return "";
  let path = url;
  try {
    const u = new URL(url, "http://x");
    path = u.pathname;
  } catch {
    path = (url.split("?")[0] ?? url).split("#")[0] ?? url;
  }
  path = path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    "/:id",
  );
  path = path.replace(/\/[^/\s?#]+@[^/\s?#]+\.[^/\s?#]+/g, "/:email");
  path = path.replace(/\/\d+(?=\/|$)/g, "/:n");
  return path;
}

function mapStatus(
  status: number | undefined,
  endpoint: string,
  message: string,
): { level: Level; fingerprint?: string[] } {
  if (/^ResizeObserver loop/.test(message)) {
    return { level: "info", fingerprint: ["known-noise", "resize-observer-loop"] };
  }
  if (typeof status === "number") {
    if (status === 401 || status === 403) {
      return {
        level: "warning",
        fingerprint: ["auth-denied", String(status), endpoint],
      };
    }
    if (status === 404) return { level: "info", fingerprint: ["not-found", endpoint] };
    if (status === 400 || status === 422) {
      return { level: "info", fingerprint: ["validation", endpoint] };
    }
    if (status >= 400 && status < 500) {
      return {
        level: "warning",
        fingerprint: ["client-error", String(status), endpoint],
      };
    }
    if (status >= 500) return { level: "error" };
  }
  if (/Failed to fetch|AbortError|NetworkError/.test(message)) {
    return { level: "error", fingerprint: ["network-error"] };
  }
  return { level: "error" };
}

function shouldSend(level: Level, random = Math.random): boolean {
  const rate = LEVEL_SAMPLE_RATES[level];
  if (rate >= 1.0) return true;
  if (rate <= 0) return false;
  return random() < rate;
}

interface DsnParts {
  publicKey: string;
  host: string;
  projectId: string;
  protocol: string;
}

function parseDsn(dsn: string): DsnParts | null {
  try {
    const u = new URL(dsn);
    return {
      publicKey: u.username,
      host: u.host,
      projectId: u.pathname.replace(/^\//, ""),
      protocol: u.protocol.replace(":", ""),
    };
  } catch {
    return null;
  }
}

export interface CaptureContext {
  status?: number;
  endpoint?: string;
  functionName?: string;
  extra?: Record<string, unknown>;
}

interface SentryEnvelopePayload {
  event_id: string;
  timestamp: number;
  platform: "javascript";
  level: Level;
  environment: string;
  tags: Record<string, string>;
  fingerprint?: string[];
  extra?: Record<string, unknown>;
  exception?: {
    values: Array<{ type: string; value: string; stacktrace?: { frames: unknown[] } }>;
  };
  message?: { formatted: string };
}

function buildPayload(
  err: unknown,
  ctx: CaptureContext,
): SentryEnvelopePayload | null {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
  const errorType = err instanceof Error ? err.name : "Error";

  const endpoint = ctx.endpoint
    ? pathTemplate(ctx.endpoint)
    : ctx.functionName
      ? `/edge/${ctx.functionName}`
      : "";

  const { level, fingerprint } = mapStatus(ctx.status, endpoint, message);
  if (!shouldSend(level)) return null;

  const tags: Record<string, string> = {
    project_name: "edge",
    environment: ENVIRONMENT,
  };
  if (ctx.functionName) tags["function_name"] = ctx.functionName;
  if (fingerprint?.[0]) tags["fingerprint_category"] = fingerprint[0];
  if (fingerprint?.[1]) tags["fingerprint_axis_1"] = fingerprint[1];
  if (fingerprint?.[2]) tags["fingerprint_axis_2"] = fingerprint[2];

  const extra = redact({
    ...(ctx.extra ?? {}),
    ...(ctx.status ? { status: ctx.status } : {}),
    ...(ctx.endpoint ? { endpoint: ctx.endpoint } : {}),
  }) as Record<string, unknown>;

  return {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level,
    environment: ENVIRONMENT,
    tags,
    ...(fingerprint ? { fingerprint } : {}),
    extra,
    exception: {
      values: [
        {
          type: errorType,
          value: message,
        },
      ],
    },
  };
}

async function sendEnvelope(payload: SentryEnvelopePayload): Promise<void> {
  if (!DSN) return;
  const parts = parseDsn(DSN);
  if (!parts) return;

  const url = `${parts.protocol}://${parts.host}/api/${parts.projectId}/envelope/`;
  const header = {
    event_id: payload.event_id,
    sent_at: new Date().toISOString(),
    dsn: DSN,
  };
  const item = { type: "event" };
  const body =
    JSON.stringify(header) +
    "\n" +
    JSON.stringify(item) +
    "\n" +
    JSON.stringify(payload) +
    "\n";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parts.publicKey}, sentry_client=high-q-edge/1.0`,
      },
      body,
    });
    if (!res.ok) {
      console.error(
        `[sentry-edge] envelope POST failed: ${res.status} ${await res.text()}`,
      );
    }
  } catch (e) {
    console.error("[sentry-edge] envelope POST threw", e);
  }
}

/**
 * Edge Function 内で例外を Sentry に送出する。
 * - DSN 未設定時は console.error のみ
 * - 本処理レスポンスをブロックしない（fire-and-forget）
 * - `ctx.status` が 4xx の場合は level:info/warning に降格、5xx と未指定は error
 */
export function captureException(err: unknown, ctx: CaptureContext = {}): void {
  if (!DSN) {
    console.error("[sentry-disabled]", err, ctx);
    return;
  }
  const payload = buildPayload(err, ctx);
  if (!payload) return;

  const promise = sendEnvelope(payload);
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  if (runtime?.waitUntil) {
    runtime.waitUntil(promise);
  } else {
    void promise;
  }
}

// Internal: テスト用に切り出し
export const __internal = {
  redact,
  pathTemplate,
  mapStatus,
  shouldSend,
  buildPayload,
  parseDsn,
};
