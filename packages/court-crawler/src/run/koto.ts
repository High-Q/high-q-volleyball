/**
 * 江東区スポーツネット crawl のエントリポイント（composition root）。
 * GitHub Actions（schedule）から `tsx src/run/koto.ts` で実行する。
 * 秘密は環境変数（GitHub Secrets）から読み、コード・ログに出さない。
 */
import { chromium, type Page } from "playwright";
import { runCrawl } from "./crawl.js";
import {
  KOTO_BASE_URL,
  KOTO_FACILITY,
  collectAvailability,
  isMonitoredVenue,
  login,
  openVolleyballGrid,
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

async function main(): Promise<void> {
  const reporter = createSentryReporter(process.env.KOTO_SENTRY_DSN);

  const credentials = {
    userId: requireEnv("KOTO_USER_ID"),
    password: requireEnv("KOTO_PASSWORD"),
  };
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
  const browser = await chromium.launch({
    headless: !process.env.KOTO_HEADFUL,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  try {
    // 実ブラウザに近い UA / 日本語ロケール / JST を付ける（headless・自動化検知の回避）。
    const context = await browser.newContext({
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      extraHTTPHeaders: { "Accept-Language": "ja,en-US;q=0.9,en;q=0.8" },
    });
    const page = await context.newPage();
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
