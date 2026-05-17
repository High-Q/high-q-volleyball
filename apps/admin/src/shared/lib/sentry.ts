import * as Sentry from "@sentry/vue";
import {
  buildBeforeSend,
  SDK_IGNORE_ERROR_PATTERNS,
  type SentryEvent,
} from "@high-q/shared/observability";
import type { App } from "vue";

declare global {
  interface Window {
    __SENTRY_TEST_SUPPRESS__?: boolean;
  }
}

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const MODE = import.meta.env.MODE;
const ENVIRONMENT: "dev" | "prd" = import.meta.env.PROD ? "prd" : "dev";
const PROJECT_NAME = "admin";

const beforeSend = buildBeforeSend({
  projectName: PROJECT_NAME,
  isSuppressed: () =>
    typeof window !== "undefined" && window.__SENTRY_TEST_SUPPRESS__ === true,
});

export function initSentry(app: App): void {
  // TODO(#267): デバッグ確認後に削除
  console.log("[sentry-debug]", {
    project: PROJECT_NAME,
    mode: MODE,
    environment: ENVIRONMENT,
    dsnPresent: !!DSN,
    dsnPrefix: DSN ? DSN.slice(0, 30) + "..." : null,
  });

  if (!DSN || MODE === "test") return;

  Sentry.init({
    app,
    dsn: DSN,
    environment: ENVIRONMENT,
    sampleRate: 1.0,
    tracesSampleRate: ENVIRONMENT === "prd" ? 0.1 : 1.0,
    ignoreErrors: [...SDK_IGNORE_ERROR_PATTERNS],
    initialScope: { tags: { project_name: PROJECT_NAME } },
    beforeSend: (event) =>
      beforeSend(event as unknown as SentryEvent) as typeof event | null,
  });
}

export interface CaptureContext {
  status?: number;
  endpoint?: string;
  extra?: Record<string, unknown>;
}

export function captureException(
  err: unknown,
  ctx: CaptureContext = {}
): void {
  if (!DSN) {
    console.error("[sentry-disabled]", err, ctx);
    return;
  }
  Sentry.captureException(err, {
    contexts:
      typeof ctx.status === "number"
        ? { response: { status_code: ctx.status } }
        : undefined,
    extra: {
      ...(ctx.extra ?? {}),
      ...(ctx.endpoint ? { endpoint: ctx.endpoint } : {}),
      ...(typeof ctx.status === "number" ? { status: ctx.status } : {}),
    },
  });
}
