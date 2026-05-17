import { LEVEL_SAMPLE_RATES } from "./constants.js";
import type { SentryEvent } from "./types.js";

/**
 * イベントの level に応じてサンプリング判定を行う。
 * true なら送出、false なら破棄（呼び出し側で `null` を返す）。
 *
 * `random` 引数で乱数源を差し替え可能（テスト用）。
 */
export function shouldSendByLevel(
  event: SentryEvent,
  random: () => number = Math.random
): boolean {
  const level = event.level ?? "error";
  const rate = LEVEL_SAMPLE_RATES[level] ?? 1.0;
  if (rate >= 1.0) return true;
  if (rate <= 0) return false;
  return random() < rate;
}
