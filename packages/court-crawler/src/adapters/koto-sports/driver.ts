/**
 * 江東区スポーツネットの照会 driver（Playwright）。
 *
 * CULTOS 系のステートフルなセッション遷移ガード（cookie / hidden g_sessionid /
 * 順序どおりの POST）を正確に追従する必要があるため、素 fetch ではなく実ブラウザで
 * 実操作を再現する。空き（○）セルの class はサーバ HTML ではなく描画 JS が
 * hidden 入力から計算して付与するため、`page.content()` は JS 実行後に読む。
 *
 * ⚠️ ログイン〜検索到達までのセレクタは spike の codegen で確認済み。ただし
 * 「日付選択のチェックボックス」と「結果グリッドの日送りナビ」は環境・日付で
 * 揺れる可能性があり、live 通し検証（オーナーが新 PW で実行）で最終調整する継ぎ目。
 */
import type { Page } from "playwright";
import type { AvailabilitySlot } from "../../core/types.js";
import { parseAvailability, parseSelectDate } from "./parse.js";
import { BUNRUI_TAIIKU, KOTO_BASE_URL, RIYOSMK_VOLLEYBALL } from "./config.js";

export interface KotoCredentials {
  /** 利用者番号。 */
  userId: string;
  /** パスワード（変更後の新 PW）。 */
  password: string;
}

/** オーナーの会員アカウントでログインする。秘密は Secrets 由来で呼び出し側が渡す。 */
export async function login(page: Page, cred: KotoCredentials): Promise<void> {
  await page.goto(KOTO_BASE_URL);
  await page.getByRole("link", { name: "パソコン版 入口" }).click();
  await page.getByRole("button", { name: "多機能操作" }).click();
  await page.getByRole("textbox", { name: "利用者番号" }).fill(cred.userId);
  await page.getByRole("textbox", { name: "パスワード" }).fill(cred.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForLoadState("networkidle");
}

/**
 * ログイン後、予約申込 → 分類（体育館系）→ 種目（バレー）→ 施設全選択 → 検索まで
 * 進め、最初の空き状況グリッドを表示する。
 *
 * ⚠️ 既定日で検索し、以降は {@link collectAvailability} が日送りで前進して集める。
 * 特定日のチェックボックスを打つ codegen の手順は日付依存のため採らない。
 */
export async function openVolleyballGrid(page: Page): Promise<void> {
  await page.getByRole("link", { name: "予約申込", exact: true }).click();
  await page
    .locator('select[name="g_bunruicd_1_show"]')
    .selectOption(BUNRUI_TAIIKU);
  await page
    .locator('form[name="selBunrui1"]')
    .getByRole("button", { name: "確定" })
    .click();
  await page.getByRole("button", { name: "全選択" }).click();
  await page.locator('select[name="riyosmk"]').selectOption(RIYOSMK_VOLLEYBALL);
  await page
    .locator('form[name="selForm_1"]')
    .getByRole("button", { name: "確定" })
    .click();
  await page.getByRole("button", { name: "全選択" }).click();
  await page
    .locator('form[name="heyaform"]')
    .getByRole("button", { name: "確定" })
    .click();
  await page.getByRole("button", { name: "検索" }).click();
  await page.waitForLoadState("networkidle");
}

export interface CollectOptions {
  /** 通知に載せる予約 URL。既定はサイト入口。 */
  reserveUrl?: string;
  /** 前進して読む最大日数（暴走防止・politeness）。既定 60。 */
  maxDays?: number;
  /** 日送りクリック間の待機（ms・politeness）。既定 1000。 */
  stepDelayMs?: number;
}

/**
 * 現在のグリッドから空き枠を読み、`#rightbutton`（翌日）で前進しながら
 * 全施設・全室場の空き枠を集約して返す（監視室場・土日祝の絞り込みは結線側）。
 * selectdate が進まなくなる / ナビが消える / maxDays 到達で停止する。
 */
export async function collectAvailability(
  page: Page,
  opts: CollectOptions = {},
): Promise<AvailabilitySlot[]> {
  const reserveUrl = opts.reserveUrl ?? KOTO_BASE_URL;
  const maxDays = opts.maxDays ?? 60;
  const stepDelayMs = opts.stepDelayMs ?? 1000;

  const slots: AvailabilitySlot[] = [];
  const seen = new Set<string>();

  for (let day = 0; day < maxDays; day++) {
    const html = await page.content();
    const slotDate = parseSelectDate(html);
    if (!slotDate || seen.has(slotDate)) break;
    seen.add(slotDate);
    slots.push(...parseAvailability(html, { slotDate, reserveUrl }));

    const next = page.locator("#rightbutton");
    if ((await next.count()) === 0 || !(await next.isVisible())) break;
    await next.click();
    // JS 再描画を待つ: selectdate が別日に変わるまで（変わらなければ末尾とみなす）。
    if (!(await waitForDateChange(page, slotDate))) break;
    await page.waitForTimeout(stepDelayMs);
  }

  return slots;
}

/**
 * 日送りクリック後、グリッドの selectdate が別日に変わるまで（描画完了まで）待つ。
 * 変われば true、timeout までに変わらなければ false（末尾に達したとみなす）。
 * ブラウザ closure を使わず Node 側で `page.content()` をポーリングして判定する。
 */
async function waitForDateChange(
  page: Page,
  prevDate: string,
  timeoutMs = 5000,
  pollMs = 200,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const d = parseSelectDate(await page.content());
    if (d && d !== prevDate) return true;
    await page.waitForTimeout(pollMs);
  }
  return false;
}
