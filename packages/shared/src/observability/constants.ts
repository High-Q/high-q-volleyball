import type { SentryLevel } from "./types.js";

/**
 * PII denylist: イベントの extra / contexts / request.data / user 内で
 * キー名が以下のパターンに該当する値は `[REDACTED]` に置換する。
 * 部分一致（小文字化して `.includes`）で判定する。
 */
export const PII_KEY_PATTERNS: readonly string[] = [
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
];

/**
 * 完全除去するヘッダ名（小文字比較）。
 */
export const PII_HEADER_NAMES: readonly string[] = [
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
];

/**
 * SDK の `ignoreErrors` で完全破棄するパターン。
 * これ以外の旧 denylist 項目は `level:info` 降格経由で集約観測する（known-noise）。
 */
export const SDK_IGNORE_ERROR_PATTERNS: readonly (string | RegExp)[] = [
  /^Non-Error promise rejection captured/,
];

/**
 * known-noise として level:info に降格させるエラーメッセージパターン。
 * 第 1 要素はパターン名（fingerprint axis として利用）。
 */
export const KNOWN_NOISE_PATTERNS: readonly { name: string; match: RegExp }[] = [
  { name: "resize-observer-loop", match: /^ResizeObserver loop/ },
  { name: "cors-script-error", match: /^Script error\.?$/ },
  { name: "extension-top-globals", match: /top\.GLOBALS/ },
  { name: "extension-original-create-notification", match: /originalCreateNotification/ },
];

/**
 * level 別サンプリング率。`beforeSend` で `Math.random()` 判定に使う。
 * - error / fatal: 全件
 * - warning: 1/5
 * - info: 1/20
 */
export const LEVEL_SAMPLE_RATES: Readonly<Record<SentryLevel, number>> = {
  fatal: 1.0,
  error: 1.0,
  warning: 0.2,
  info: 0.05,
  debug: 0.0,
};

/**
 * placeholder にする値: `[REDACTED]` で統一。
 */
export const REDACTED_PLACEHOLDER = "[REDACTED]";
