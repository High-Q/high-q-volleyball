import { applyStatusMapping } from "./mapStatus.js";
import { redactPII } from "./redactPII.js";
import { shouldSendByLevel } from "./sample.js";
import type { SentryEvent } from "./types.js";

export interface BuildBeforeSendOptions {
  /** `project_name` タグの値。各アプリ側で指定する。 */
  projectName: string;
  /** テスト用の乱数源（省略時 Math.random）。 */
  random?: () => number;
  /** テスト送出抑制フラグ（true で常に null）。 */
  isSuppressed?: () => boolean;
}

/**
 * Sentry の `beforeSend` フックを組み立てる。
 *
 * 適用順序:
 *   1. 抑制フラグ判定
 *   2. PII 除去
 *   3. status / メッセージマッピングで level / fingerprint / tag を書き換え
 *   4. project_name タグ付与
 *   5. level 別サンプリング
 *
 * 戻り値が `null` のときは送出スキップ。
 */
export function buildBeforeSend(
  options: BuildBeforeSendOptions
): (event: SentryEvent) => SentryEvent | null {
  const random = options.random ?? Math.random;
  const isSuppressed = options.isSuppressed ?? (() => false);

  return (event: SentryEvent): SentryEvent | null => {
    if (isSuppressed()) return null;

    let next = redactPII(event);
    next = applyStatusMapping(next);

    const tags = { ...(next.tags ?? {}) };
    tags["project_name"] = options.projectName;
    next.tags = tags;

    if (!shouldSendByLevel(next, random)) return null;

    return next;
  };
}
