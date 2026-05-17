import {
  PII_HEADER_NAMES,
  PII_KEY_PATTERNS,
  REDACTED_PLACEHOLDER,
} from "./constants.js";
import type { SentryEvent } from "./types.js";

function isPIIKey(key: string): boolean {
  const lower = key.toLowerCase();
  return PII_KEY_PATTERNS.some((p) => lower.includes(p));
}

function redactValue(): string {
  return REDACTED_PLACEHOLDER;
}

function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (isPIIKey(k)) {
      out[k] = redactValue();
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redactObject(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function redactHeaders(
  headers: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (PII_HEADER_NAMES.includes(k.toLowerCase())) {
      out[k] = REDACTED_PLACEHOLDER;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function stripQueryFromUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  const idx = url.indexOf("?");
  return idx >= 0 ? url.slice(0, idx) : url;
}

/**
 * Sentry イベントから PII を除去する純関数。
 *
 * - request.headers の `authorization` / `cookie` 等を `[REDACTED]` に
 * - request.cookies を `[REDACTED]` に
 * - extra / contexts / request.data 内のキー名 denylist 該当値を `[REDACTED]` に
 * - スタックトレースフレームの URL クエリ文字列を削除
 * - user.email / user.username を削除（user.id は保持）
 */
export function redactPII(event: SentryEvent): SentryEvent {
  const next: SentryEvent = { ...event };

  if (next.request) {
    const req = { ...next.request };
    if (req.headers) {
      req.headers = redactHeaders(req.headers);
    }
    if (req.cookies) {
      req.cookies = REDACTED_PLACEHOLDER;
    }
    if (req.data && typeof req.data === "object" && !Array.isArray(req.data)) {
      req.data = redactObject(req.data as Record<string, unknown>);
    }
    next.request = req;
  }

  if (next.extra) {
    next.extra = redactObject(next.extra);
  }

  if (next.contexts) {
    const ctxs: Record<string, Record<string, unknown>> = {};
    for (const [k, v] of Object.entries(next.contexts)) {
      ctxs[k] = redactObject(v);
    }
    next.contexts = ctxs;
  }

  if (next.user) {
    next.user = next.user.id ? { id: next.user.id } : {};
  }

  if (next.exception?.values) {
    next.exception = {
      values: next.exception.values.map((ex) => {
        if (!ex.stacktrace?.frames) return ex;
        return {
          ...ex,
          stacktrace: {
            frames: ex.stacktrace.frames.map((f) => ({
              ...f,
              filename: stripQueryFromUrl(f.filename),
              abs_path: stripQueryFromUrl(f.abs_path),
            })),
          },
        };
      }),
    };
  }

  return next;
}
