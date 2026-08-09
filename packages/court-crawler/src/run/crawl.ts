/**
 * crawl オーケストレーション（施設非依存）。
 * アダプタ（collect）→ 絞り込み（監視室場・土日祝・リードタイム）→ reconcile →
 * LINE 通知 → ストア更新 を結線し、失敗は握って Sentry(reporter) に記録する
 * （「通知が来ない = 空きが無い」の誤認を避けるため静かに落とさない）。
 */
import type { AvailabilitySlot } from "../core/types.js";
import { reconcile } from "../core/reconcile.js";
import { filterTargetSlots } from "../core/filter.js";
import { formatNotification } from "../core/format.js";
import { reportCrawlFailure, type FailureReporter } from "../core/failure.js";
import type { NotifiedStore } from "../store/notified-store.js";
import type { LinePushResult } from "../notify/line.js";

export interface CrawlDeps {
  /** 施設アダプタ識別子（ストアの絞り込みキー）。 */
  facility: string;
  /** アダプタの照会。空き枠と、グリッドを読めた日数を返す。 */
  collect: () => Promise<{ slots: AvailabilitySlot[]; gridDays: number }>;
  /** 通知済みストア。 */
  store: NotifiedStore;
  /** 整形済みテキストを push する（LINE 等）。 */
  notify: (text: string) => Promise<LinePushResult>;
  /** 失敗記録の出力口（Sentry 等）。 */
  reporter: FailureReporter;
  /** 判定基準の現在時刻。 */
  now: Date;
  /** 最小リードタイム（ms）。 */
  minLeadTimeMs: number;
  /** 祝日判定。 */
  isHoliday: (ymd: string) => boolean;
  /** 監視室場フィルタ（会場名 → 対象か）。既定は全通過。 */
  venueFilter?: (venueName: string) => boolean;
}

export interface CrawlSummary {
  /** crawl が到達・パースまで到達したか（push 失敗は別途 reporter 記録）。 */
  ok: boolean;
  /** 新規通知した枠数。 */
  notified: number;
  /** 記録解除した枠数。 */
  released: number;
  /** グリッドを読めた日数。 */
  scannedDays: number;
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function runCrawl(deps: CrawlDeps): Promise<CrawlSummary> {
  const venueOk = deps.venueFilter ?? (() => true);

  let collected: { slots: AvailabilitySlot[]; gridDays: number };
  try {
    collected = await deps.collect();
  } catch (e) {
    reportCrawlFailure(deps.reporter, "unreachable", messageOf(e), {
      facility: deps.facility,
    });
    return { ok: false, notified: 0, released: 0, scannedDays: 0 };
  }

  // グリッドを 1 日も読めなければレイアウト破壊の疑い（全埋まり＝空きゼロとは区別）。
  if (collected.gridDays === 0) {
    reportCrawlFailure(
      deps.reporter,
      "parse_empty",
      "空き状況グリッドを読めませんでした（レイアウト変化の疑い）",
      { facility: deps.facility },
    );
    return { ok: false, notified: 0, released: 0, scannedDays: 0 };
  }

  const current = filterTargetSlots(
    collected.slots.filter((s) => venueOk(s.venueName)),
    {
      now: deps.now,
      minLeadTimeMs: deps.minLeadTimeMs,
      isHoliday: deps.isHoliday,
    },
  );

  let notified: AvailabilitySlot[];
  try {
    notified = await deps.store.fetchNotified(deps.facility);
  } catch (e) {
    reportCrawlFailure(deps.reporter, "unexpected", `通知済み取得に失敗: ${messageOf(e)}`, {
      facility: deps.facility,
    });
    return {
      ok: false,
      notified: 0,
      released: 0,
      scannedDays: collected.gridDays,
    };
  }

  const { toNotify, toRelease } = reconcile(current, notified);

  // 埋まった枠を先に記録解除（再オープン時に新規として素直に再通知されるように）。
  if (toRelease.length) {
    try {
      await deps.store.removeReleased(toRelease);
    } catch (e) {
      reportCrawlFailure(deps.reporter, "unexpected", `記録解除に失敗: ${messageOf(e)}`, {
        facility: deps.facility,
      });
    }
  }

  let notifiedCount = 0;
  if (toNotify.length) {
    const res = await deps.notify(formatNotification(toNotify));
    if (res.ok) {
      // push 成功時のみ記録（失敗時は記録せず次回再送）。
      try {
        await deps.store.addNotified(toNotify);
        notifiedCount = toNotify.length;
      } catch (e) {
        reportCrawlFailure(
          deps.reporter,
          "unexpected",
          `通知済み記録に失敗: ${messageOf(e)}`,
          { facility: deps.facility },
        );
      }
    } else {
      reportCrawlFailure(
        deps.reporter,
        "http_error",
        `LINE push 失敗: ${res.status} ${res.error}`,
        { facility: deps.facility, count: toNotify.length },
      );
    }
  }

  return {
    ok: true,
    notified: notifiedCount,
    released: toRelease.length,
    scannedDays: collected.gridDays,
  };
}
