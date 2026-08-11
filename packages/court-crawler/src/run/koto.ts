/**
 * 江東区スポーツネット crawl のエントリポイント（composition root）。
 * GitHub Actions（schedule）から `tsx src/run/koto.ts` で実行する。
 * 秘密は環境変数（GitHub Secrets）から読み、コード・ログに出さない。
 */
import { appendFileSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright";
import { runCrawl, type CrawlSummary } from "./crawl.js";
import {
  KOTO_BASE_URL,
  KOTO_FACILITY,
  collectAvailability,
  diagnoseGridStructure,
  isMonitoredVenue,
  login,
  openVolleyballGrid,
  snapshotGridSkeleton,
  snapshotResultNav,
} from "../adapters/koto-sports/index.js";
import { isJapaneseHoliday } from "../adapters/koto-sports/holidays.js";
import { createSupabaseNotifiedStore } from "../store/supabase-store.js";
import { pushLineMessage } from "../notify/line.js";
import {
  createSentryReporter,
  flushSentry,
} from "../notify/sentry-reporter.js";
import { effectiveRequestIntervalMs } from "../core/politeness.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`環境変数 ${name} が未設定です`);
  return v;
}

function numEnv(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** 失敗時の軽量診断: 現在 URL と、見えているボタン/リンクの名前を出す（PII なし想定）。 */
async function dumpControls(page: Page): Promise<void> {
  const clean = (texts: string[]) =>
    texts
      .map((t) => t.replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 0 && t.length < 40)
      .slice(0, 40);
  const [title, buttons, links] = await Promise.all([
    page.title(),
    page.getByRole("button").allInnerTexts(),
    page.getByRole("link").allInnerTexts(),
  ]);
  console.error("[court-crawler] diag url:", page.url());
  console.error("[court-crawler] diag title:", title);
  console.error("[court-crawler] diag buttons:", JSON.stringify(clean(buttons)));
  console.error("[court-crawler] diag links:", JSON.stringify(clean(links)));
}

/** 実ブラウザに近い context（headless・自動化検知の回避）。crawl / 診断で共通に使う。 */
const CONTEXT_OPTIONS = {
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  extraHTTPHeaders: { "Accept-Language": "ja,en-US;q=0.9,en;q=0.8" },
} as const;

/** browser を起動し、本番と同じ context / page を返す（診断と本番の環境差を作らない）。 */
async function launchContextPage(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({
    headless: !process.env.KOTO_HEADFUL,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext(CONTEXT_OPTIONS);
  const page = await context.newPage();
  return { browser, page };
}

/**
 * 一時診断モード（KOTO_DIAGNOSE=1）: crawl せず・LINE 送らず・ストア更新もせず、
 * 各日のグリッド構造を sanitize してダンプする（原因切り分け専用の足場・#375）。
 * パースが読むのと同じ HTML を観測し、class 変化か描画未完（タイミング）かを見分ける。
 */
async function runDiagnostics(credentials: {
  userId: string;
  password: string;
}): Promise<void> {
  const maxDays = numEnv("KOTO_MAX_DAYS", 60);
  const { browser, page } = await launchContextPage();
  try {
    await login(page, credentials);
    await openVolleyballGrid(page, { diagnose: true });
    await snapshotResultNav(page);
    await snapshotGridSkeleton(page);
    let days = 0;
    await collectAvailability(page, {
      reserveUrl: KOTO_BASE_URL,
      maxDays,
      stepDelayMs: effectiveRequestIntervalMs(),
      onDay: (html, slotDate) => {
        days++;
        console.log(
          "[court-crawler] diagnose",
          JSON.stringify(diagnoseGridStructure(html, slotDate)),
        );
      },
    });
    console.log("[court-crawler] diagnose done", JSON.stringify({ days }));
  } catch (e) {
    await dumpControls(page).catch(() => undefined);
    throw e;
  } finally {
    await browser.close();
  }
}

/**
 * 空き検知 funnel を GitHub Actions の job summary に出す（DSN 未設定でも run 一覧で
 * どの段階で 0 件に落ちたか追える）。GITHUB_STEP_SUMMARY 未設定のローカルでは何もしない。
 */
function writeJobSummary(summary: CrawlSummary): void {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  const silentZero = summary.scannedDays > 0 && summary.rawSlots === 0;
  const lines = [
    "### 🏐 空き検知 funnel",
    "",
    "| 段階 | 件数 |",
    "| --- | ---: |",
    `| 読めたグリッド日数 | ${summary.scannedDays} |`,
    `| 生の空き枠（絞り込み前） | ${summary.rawSlots} |`,
    `| 監視室場フィルタ後 | ${summary.monitoredSlots} |`,
    `| 通知候補（土日祝・リード） | ${summary.targetSlots} |`,
    `| 新規通知 | ${summary.notified} |`,
    `| 記録解除 | ${summary.released} |`,
    "",
  ];
  if (silentZero) {
    lines.push(
      "> ⚠️ グリッドは取得できたが**生の空き枠が 0 件**（パース/構造変化の疑い）。",
      "",
    );
  }
  appendFileSync(path, lines.join("\n") + "\n");
}

async function main(): Promise<void> {
  const reporter = createSentryReporter(process.env.KOTO_SENTRY_DSN);

  const credentials = {
    userId: requireEnv("KOTO_USER_ID"),
    password: requireEnv("KOTO_PASSWORD"),
  };

  // 一時診断（#375）: 資格情報だけで走り、LINE / ストアの秘密は要求しない。
  if (process.env.KOTO_DIAGNOSE) {
    await runDiagnostics(credentials);
    await flushSentry();
    return;
  }

  const lineConfig = {
    channelToken: requireEnv("KOTO_LINE_CHANNEL_TOKEN"),
    toUserId: requireEnv("KOTO_LINE_TO_USER_ID"),
  };

  // 一時検証用: KOTO_TEST_LINE=1 なら crawl せず、実トークンで LINE を 1 通送って
  // 配信レグ（token / 宛先）だけを確認して終了する。
  if (process.env.KOTO_TEST_LINE) {
    const r = await pushLineMessage(
      lineConfig,
      "🏐 [テスト] court-crawler の LINE 配信確認です（本番の空き通知ではありません）",
    );
    console.log("[court-crawler] test-line result:", JSON.stringify(r));
    await flushSentry();
    return;
  }
  const store = createSupabaseNotifiedStore(
    requireEnv("KOTO_SUPABASE_URL"),
    requireEnv("KOTO_SUPABASE_SERVICE_ROLE_KEY"),
  );

  const minLeadTimeMs = numEnv("KOTO_MIN_LEAD_HOURS", 3) * 60 * 60 * 1000;
  const maxDays = numEnv("KOTO_MAX_DAYS", 60);
  // 一時検証用: KOTO_MONITOR_ALL=1 で監視室場フィルタを外し全室場を通知対象にする
  // （LINE 実配信の確認用。通常運用では未設定＝大体育室 半面のみ）。
  const monitorAll = !!process.env.KOTO_MONITOR_ALL;

  // ローカル動作確認用: KOTO_HEADFUL=1 でブラウザを表示して遷移を目視できる。
  const { browser, page } = await launchContextPage();
  try {
    const summary = await runCrawl({
      facility: KOTO_FACILITY,
      collect: async () => {
        try {
          await login(page, credentials);
          await openVolleyballGrid(page);
          return await collectAvailability(page, {
            reserveUrl: KOTO_BASE_URL,
            maxDays,
            stepDelayMs: effectiveRequestIntervalMs(),
          });
        } catch (e) {
          // 失敗時の軽量診断（ログイン前想定・PII なし）: URL と見えている操作要素の名前。
          await dumpControls(page).catch(() => undefined);
          throw e;
        }
      },
      store,
      notify: (text) => pushLineMessage(lineConfig, text),
      reporter,
      now: new Date(),
      minLeadTimeMs,
      isHoliday: isJapaneseHoliday,
      ...(monitorAll ? {} : { venueFilter: isMonitoredVenue }),
    });
    console.log("[court-crawler] summary", summary);
    writeJobSummary(summary);
  } finally {
    await browser.close();
    await flushSentry();
  }
}

main().catch(async (e) => {
  console.error("[court-crawler] fatal", e);
  process.exitCode = 1;
  await flushSentry();
});
