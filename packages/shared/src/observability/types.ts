/**
 * Sentry event shape の最小 subset。@sentry/vue / Deno HTTP 直送の双方で扱えるよう
 * フレームワーク非依存に保つ。実イベントはこれより多くのフィールドを持つが、フィルタが
 * 触るキーだけ型で固定する。
 */

export type SentryLevel = "fatal" | "error" | "warning" | "info" | "debug";

export interface SentryRequest {
  url?: string;
  method?: string;
  cookies?: Record<string, string> | string;
  headers?: Record<string, string>;
  data?: unknown;
  query_string?: string;
}

export interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
  [key: string]: unknown;
}

export interface SentryStackFrame {
  filename?: string | undefined;
  function?: string | undefined;
  abs_path?: string | undefined;
  [key: string]: unknown;
}

export interface SentryException {
  type?: string;
  value?: string;
  stacktrace?: {
    frames?: SentryStackFrame[];
  };
}

export interface SentryEvent {
  level?: SentryLevel;
  fingerprint?: string[];
  tags?: Record<string, string>;
  request?: SentryRequest;
  user?: SentryUser;
  extra?: Record<string, unknown>;
  contexts?: Record<string, Record<string, unknown>>;
  exception?: {
    values?: SentryException[];
  };
  message?: string;
  /** カスタムフィールド: 呼び出し側が HTTP status を埋めるための足場 */
  __http_status?: number;
  /** カスタムフィールド: 呼び出し側が API endpoint を埋めるための足場 */
  __endpoint?: string;
}

export type FingerprintCategory =
  | "auth-denied"
  | "not-found"
  | "validation"
  | "client-error"
  | "network-error"
  | "known-noise";
