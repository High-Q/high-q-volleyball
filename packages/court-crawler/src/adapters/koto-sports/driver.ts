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
import {
  hasAvailabilityGrid,
  parseAvailability,
  parseSelectDate,
} from "./parse.js";
import { BUNRUI_TAIIKU, KOTO_BASE_URL, RIYOSMK_VOLLEYBALL } from "./config.js";

export interface KotoCredentials {
  /** 利用者番号。 */
  userId: string;
  /** パスワード（変更後の新 PW）。 */
  password: string;
}

/** 進捗ログ（どのステップまで到達したか live 検証で追える）。 */
function step(msg: string): void {
  console.log(`[court-crawler] step: ${msg}`);
}

/** オーナーの会員アカウントでログインする。秘密は Secrets 由来で呼び出し側が渡す。 */
export async function login(page: Page, cred: KotoCredentials): Promise<void> {
  step("トップへ遷移");
  await page.goto(KOTO_BASE_URL);
  step("パソコン版 入口");
  await page.getByRole("link", { name: "パソコン版 入口" }).click();
  step("多機能操作");
  await page.getByRole("button", { name: "多機能操作" }).click();
  step("資格情報を入力");
  await page.getByRole("textbox", { name: "利用者番号" }).fill(cred.userId);
  await page.getByRole("textbox", { name: "パスワード" }).fill(cred.password);
  step("ログイン クリック");
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForLoadState("networkidle");

  // ログイン成否を確認（失敗を「予約申込が無い」等の分かりにくい後続エラーにしない）。
  const loggedIn = await page
    .getByRole("link", { name: "予約申込", exact: true })
    .isVisible()
    .catch(() => false);
  if (!loggedIn) {
    throw new Error(
      "ログインに失敗した可能性（予約申込リンクが見つからない）。利用者番号 / パスワードを確認してください",
    );
  }
  step("ログイン成功");
}

/**
 * ログイン後、予約申込 → 分類（体育館系）→ 種目（バレー）→ 施設全選択 → 検索まで
 * 進め、最初の空き状況グリッドを表示する。
 *
 * ⚠️ 既定日で検索し、以降は {@link collectAvailability} が日送りで前進して集める。
 * 特定日のチェックボックスを打つ codegen の手順は日付依存のため採らない。
 */
export async function openVolleyballGrid(page: Page): Promise<void> {
  step("予約申込");
  await page.getByRole("link", { name: "予約申込", exact: true }).click();
  step("分類を選択（体育館系）");
  await page
    .locator('select[name="g_bunruicd_1_show"]')
    .selectOption(BUNRUI_TAIIKU);
  await page
    .locator('form[name="selBunrui1"]')
    .getByRole("button", { name: "確定" })
    .click();
  step("施設 全選択");
  await page.getByRole("button", { name: "全選択" }).click();
  step("種目を選択（バレー）");
  await page.locator('select[name="riyosmk"]').selectOption(RIYOSMK_VOLLEYBALL);
  await page
    .locator('form[name="selForm_1"]')
    .getByRole("button", { name: "確定" })
    .click();
  step("室場 全選択");
  await page.getByRole("button", { name: "全選択" }).click();
  await page
    .locator('form[name="heyaform"]')
    .getByRole("button", { name: "確定" })
    .click();

  // TODO(#286 diag・一時): 日付選択チェックボックスの構造を採取（value に日付想定）。
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const cbs = page.getByRole("checkbox");
  const cbn = await cbs.count();
  const cbInfo: Array<Record<string, string | null>> = [];
  for (let i = 0; i < Math.min(cbn, 50); i++) {
    const el = cbs.nth(i);
    cbInfo.push({
      name: await el.getAttribute("name"),
      value: await el.getAttribute("value"),
      id: await el.getAttribute("id"),
    });
  }
  console.error("[court-crawler] diag date-checkbox count:", cbn);
  console.error("[court-crawler] diag date-checkboxes:", JSON.stringify(cbInfo));
  const dateTexts = (await page.locator("body").allInnerTexts())
    .join(" ")
    .match(/\d{1,2}\/\d{1,2}|\d{1,2}月\d{1,2}日|[月火水木金土日]曜/g);
  console.error(
    "[court-crawler] diag date-tokens:",
    JSON.stringify((dateTexts ?? []).slice(0, 30)),
  );

  step("検索");
  await page.getByRole("button", { name: "検索" }).click();
  await page.waitForLoadState("networkidle");
  step("結果グリッド表示");
}

export interface CollectOptions {
  /** 通知に載せる予約 URL。既定はサイト入口。 */
  reserveUrl?: string;
  /** 前進して読む最大日数（暴走防止・politeness）。既定 60。 */
  maxDays?: number;
  /** 日送りクリック間の待機（ms・politeness）。既定 1000。 */
  stepDelayMs?: number;
}

export interface CollectResult {
  /** 集約した全施設・全室場の空き枠。 */
  slots: AvailabilitySlot[];
  /** グリッドを実際に読めた日数。0 ならレイアウト破壊の疑い（結線側で parse_empty）。 */
  gridDays: number;
}

/**
 * 現在のグリッドから空き枠を読み、`#rightbutton`（翌日）で前進しながら
 * 全施設・全室場の空き枠を集約して返す（監視室場・土日祝の絞り込みは結線側）。
 * selectdate が進まなくなる / ナビが消える / maxDays 到達で停止する。
 * gridDays はグリッドを読めた日数（0 = レイアウト破壊の疑い）。
 */
export async function collectAvailability(
  page: Page,
  opts: CollectOptions = {},
): Promise<CollectResult> {
  const reserveUrl = opts.reserveUrl ?? KOTO_BASE_URL;
  const maxDays = opts.maxDays ?? 60;
  const stepDelayMs = opts.stepDelayMs ?? 1000;

  const slots: AvailabilitySlot[] = [];
  const seen = new Set<string>();
  let gridDays = 0;

  for (let day = 0; day < maxDays; day++) {
    const html = await page.content();
    const slotDate = parseSelectDate(html);
    if (!slotDate || seen.has(slotDate)) break;
    seen.add(slotDate);
    if (hasAvailabilityGrid(html)) gridDays++;
    slots.push(...parseAvailability(html, { slotDate, reserveUrl }));

    const next = page.locator("#rightbutton");
    if ((await next.count()) === 0 || !(await next.isVisible())) break;
    await next.click();
    // JS 再描画を待つ: selectdate が別日に変わるまで（変わらなければ末尾とみなす）。
    if (!(await waitForDateChange(page, slotDate))) break;
    await page.waitForTimeout(stepDelayMs);
  }

  return { slots, gridDays };
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
