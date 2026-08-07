/**
 * crawl 失敗の記録（Sentry 送出は注入式の reporter に委ねる）。
 * 「空きが無い」との誤認を避けるため、失敗は握りつぶさず必ず記録する。
 */

export type CrawlFailureKind =
  /** サイトへ到達できない（タイムアウト・DNS・接続断など）。 */
  | "unreachable"
  /** HTTP エラー応答（4xx / 5xx）。 */
  | "http_error"
  /** 応答は得たがパースできない・空き 0 件が継続する（レイアウト変化の疑い）。 */
  | "parse_empty"
  /** 想定外の例外。 */
  | "unexpected";

export interface CrawlFailure {
  kind: CrawlFailureKind;
  message: string;
  context?: Record<string, unknown>;
}

/** Sentry 等へ失敗を送る出力口。テスト・実装差し替えのため注入する。 */
export interface FailureReporter {
  capture(failure: CrawlFailure): void;
}

/** 失敗を組み立てて reporter に送る。 */
export function reportCrawlFailure(
  reporter: FailureReporter,
  kind: CrawlFailureKind,
  message: string,
  context?: Record<string, unknown>,
): void {
  reporter.capture({
    kind,
    message,
    ...(context ? { context } : {}),
  });
}
