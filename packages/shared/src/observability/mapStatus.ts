import { KNOWN_NOISE_PATTERNS } from "./constants.js";
import { pathTemplate } from "./pathTemplate.js";
import type { SentryEvent, SentryLevel } from "./types.js";

/**
 * HTTP status / メッセージパターンを見て event.level と event.fingerprint を決定する。
 * design.md D8 / D9 のマッピング表に対応。
 *
 * 戻り値は破壊しない新オブジェクト。呼び出し側は redactPII / sampleByLevel と組み合わせる。
 */

const NETWORK_ERROR_PATTERNS: readonly RegExp[] = [
  /TypeError: Failed to fetch/,
  /^NetworkError/,
  /^AbortError/,
  /Load failed/,
];

function extractStatus(event: SentryEvent): number | undefined {
  if (typeof event.__http_status === "number") {
    return event.__http_status;
  }
  const extraStatus = event.extra && (event.extra as Record<string, unknown>)["status"];
  if (typeof extraStatus === "number") return extraStatus;

  const contextStatus =
    event.contexts?.["response"] &&
    (event.contexts["response"] as Record<string, unknown>)["status_code"];
  if (typeof contextStatus === "number") return contextStatus;

  return undefined;
}

function extractEndpoint(event: SentryEvent): string {
  if (event.__endpoint) return event.__endpoint;
  const extraEndpoint =
    event.extra && (event.extra as Record<string, unknown>)["endpoint"];
  if (typeof extraEndpoint === "string") return pathTemplate(extraEndpoint);
  const url = event.request?.url;
  return url ? pathTemplate(url) : "";
}

function extractMessage(event: SentryEvent): string {
  if (event.message) return event.message;
  return event.exception?.values?.[0]?.value ?? "";
}

function matchKnownNoise(message: string): string | undefined {
  for (const { name, match } of KNOWN_NOISE_PATTERNS) {
    if (match.test(message)) return name;
  }
  return undefined;
}

function isNetworkError(message: string): boolean {
  return NETWORK_ERROR_PATTERNS.some((p) => p.test(message));
}

export interface MapStatusResult {
  level: SentryLevel;
  fingerprint?: string[];
}

export function mapStatusToLevelAndFingerprint(
  event: SentryEvent
): MapStatusResult {
  const message = extractMessage(event);

  const noisePattern = matchKnownNoise(message);
  if (noisePattern) {
    return {
      level: "info",
      fingerprint: ["known-noise", noisePattern],
    };
  }

  const status = extractStatus(event);
  if (typeof status === "number") {
    const endpoint = extractEndpoint(event);

    if (status === 401 || status === 403) {
      return {
        level: "warning",
        fingerprint: ["auth-denied", String(status), endpoint],
      };
    }
    if (status === 404) {
      return {
        level: "info",
        fingerprint: ["not-found", endpoint],
      };
    }
    if (status === 400 || status === 422) {
      return {
        level: "info",
        fingerprint: ["validation", endpoint],
      };
    }
    if (status >= 400 && status < 500) {
      return {
        level: "warning",
        fingerprint: ["client-error", String(status), endpoint],
      };
    }
    if (status >= 500) {
      return { level: "error" };
    }
  }

  if (isNetworkError(message)) {
    return {
      level: "error",
      fingerprint: ["network-error"],
    };
  }

  return { level: event.level ?? "error" };
}

/**
 * mapStatusToLevelAndFingerprint の結果を event に適用した新オブジェクトを返す。
 * 同時に fingerprint 配列を tag 化（Issue Alert の条件式で参照できるよう）。
 */
export function applyStatusMapping(event: SentryEvent): SentryEvent {
  const { level, fingerprint } = mapStatusToLevelAndFingerprint(event);
  const next: SentryEvent = { ...event, level };

  if (fingerprint) {
    next.fingerprint = fingerprint;
    const tags = { ...(next.tags ?? {}) };
    tags["fingerprint_category"] = fingerprint[0] ?? "";
    if (fingerprint[1]) tags["fingerprint_axis_1"] = fingerprint[1];
    if (fingerprint[2]) tags["fingerprint_axis_2"] = fingerprint[2];
    next.tags = tags;
  }

  return next;
}
