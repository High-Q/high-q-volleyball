/**
 * 江東区スポーツネット crawl のエントリポイント（composition root）。
 * GitHub Actions（schedule）から `tsx src/run/koto.ts` で実行する。
 * 秘密は環境変数（GitHub Secrets）から読み、コード・ログに出さない。
 */
import { chromium } from "playwright";
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
  const store = createSupabaseNotifiedStore(
    requireEnv("KOTO_SUPABASE_URL"),
    requireEnv("KOTO_SUPABASE_SERVICE_ROLE_KEY"),
  );

  const minLeadTimeMs = numEnv("KOTO_MIN_LEAD_HOURS", 3) * 60 * 60 * 1000;
  const maxDays = numEnv("KOTO_MAX_DAYS", 60);

  // ローカル動作確認用: KOTO_HEADFUL=1 でブラウザを表示して遷移を目視できる。
  const browser = await chromium.launch({
    headless: !process.env.KOTO_HEADFUL,
  });
  try {
    const page = await browser.newPage();
    const summary = await runCrawl({
      facility: KOTO_FACILITY,
      collect: async () => {
        await login(page, credentials);
        await openVolleyballGrid(page);
        return collectAvailability(page, {
          reserveUrl: KOTO_BASE_URL,
          maxDays,
          stepDelayMs: effectiveRequestIntervalMs(),
        });
      },
      store,
      notify: (text) => pushLineMessage(lineConfig, text),
      reporter,
      now: new Date(),
      minLeadTimeMs,
      isHoliday: isJapaneseHoliday,
      venueFilter: isMonitoredVenue,
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
