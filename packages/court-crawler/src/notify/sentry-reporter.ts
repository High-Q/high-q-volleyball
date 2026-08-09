/**
 * FailureReporter の Sentry(@sentry/node) 実装。
 * crawl 失敗を握りつぶさず観測できるようにする（「通知が来ない = 空きが無い」の
 * 誤認防止）。DSN 未設定なら console.error にフォールバックする（degraded）。
 */
import * as Sentry from "@sentry/node";
import type { CrawlFailure, FailureReporter } from "../core/failure.js";

/** parse_empty / http_error 等は警告、想定外だけ error 相当に寄せる。 */
function levelOf(kind: CrawlFailure["kind"]): Sentry.SeverityLevel {
  return kind === "unexpected" ? "error" : "warning";
}

/**
 * Sentry へ失敗を送るレポーターを作る。dsn 未指定時は初期化せず console 出力のみ。
 * environment は crawl ジョブ識別（既定 "court-crawler"）。
 */
export function createSentryReporter(
  dsn?: string,
  environment = "court-crawler",
): FailureReporter {
  const enabled = !!dsn;
  if (enabled) {
    Sentry.init({ dsn, environment, tracesSampleRate: 0 });
  }

  return {
    capture(failure: CrawlFailure) {
      // GitHub Actions のログにも必ず残す。
      console.error(
        `[court-crawler] ${failure.kind}: ${failure.message}`,
        failure.context ?? {},
      );
      if (!enabled) return;
      Sentry.captureMessage(`court-crawler ${failure.kind}: ${failure.message}`, {
        level: levelOf(failure.kind),
        tags: { crawl_failure_kind: failure.kind },
        ...(failure.context ? { extra: failure.context } : {}),
      });
    },
  };
}

/** 送信中の Sentry イベントを送り切る（プロセス終了前に呼ぶ）。 */
export async function flushSentry(timeoutMs = 2000): Promise<void> {
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    /* flush 失敗は無視（ログは済んでいる） */
  }
}
