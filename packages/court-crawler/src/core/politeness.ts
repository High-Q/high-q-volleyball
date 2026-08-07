/**
 * politeness 制御（サイトへの負荷・規約順守のためのアクセス間隔）。
 * 定期実行間隔（既定 20 分）はスケジューラ側で担保し、ここでは crawl 内の
 * リクエスト間隔と robots.txt の Crawl-delay 順守を純関数として提供する。
 */

/** 既定の照会間隔（20 分）。スケジューラ（GitHub Actions cron）の既定値。 */
export const POLL_INTERVAL_MS = 20 * 60 * 1000;

/** crawl 内でリクエストを刻む際の最小間隔（ms）。 */
export const MIN_REQUEST_INTERVAL_MS = 1000;

/**
 * robots.txt の `Crawl-delay`（秒）を反映した実効リクエスト間隔（ms）。
 * 指定が無い/不正なら floor（既定 1 秒）を返す。指定があれば floor と大きい方。
 */
export function effectiveRequestIntervalMs(
  crawlDelaySec?: number | null,
  floorMs: number = MIN_REQUEST_INTERVAL_MS,
): number {
  if (crawlDelaySec == null || !Number.isFinite(crawlDelaySec) || crawlDelaySec <= 0) {
    return floorMs;
  }
  return Math.max(floorMs, Math.round(crawlDelaySec * 1000));
}

/**
 * 前回リクエスト時刻からの経過を踏まえ、次リクエストまで待つべき ms。
 * 初回（lastRequestAt=null）は 0。既に間隔を満たしていれば 0。
 */
export function nextRequestDelayMs(
  lastRequestAt: number | null,
  now: number,
  intervalMs: number = MIN_REQUEST_INTERVAL_MS,
): number {
  if (lastRequestAt === null) return 0;
  return Math.max(0, intervalMs - (now - lastRequestAt));
}
