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
  parseReiwaDate,
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
 * 選択ページの状態を sanitize してダンプする（原因 B 診断・#375）。
 * 「全選択」がどのステップで落ちているかを、チェックボックスの総数/選択数と
 * 施設・室場名（PII なし）で観測する。認証情報・セッション ID は含めない。
 */
async function snapshotSelection(page: Page, label: string): Promise<void> {
  // evaluate はブラウザ側で走る。tsx/esbuild が関数へ注入する __name ヘルパーが
  // ブラウザに無く ReferenceError になるため、関数ではなく文字列式を渡す。
  const snap = await page.evaluate(`(() => {
    const short = (t) => (t == null ? "" : String(t)).replace(/\\s+/g, " ").trim().slice(0, 24);
    const boxes = Array.from(document.querySelectorAll('input[type="checkbox"]')).map((cb) => ({
      value: short(cb.value),
      checked: !!cb.checked,
      label: short(cb.parentElement && cb.parentElement.textContent),
    }));
    const selects = Array.from(document.querySelectorAll('select')).map((sel) => ({
      name: String(sel.name),
      optionCount: sel.options.length,
      selected: Array.from(sel.selectedOptions).map((o) => short(o.text)),
    }));
    return {
      checkboxTotal: boxes.length,
      checkboxChecked: boxes.filter((b) => b.checked).length,
      boxes: boxes.slice(0, 30),
      selects,
    };
  })()`);
  console.log(`[court-crawler] diag-sel ${label}`, JSON.stringify(snap));
}

/**
 * 結果ページのナビゲーション構造を sanitize してダンプする（原因 B 診断・#375）。
 * 室場ごとにページ分割されている場合の「室場切替」導線（リンク / select / ボタン）を探す。
 */
export async function snapshotResultNav(page: Page): Promise<void> {
  const snap = await page.evaluate(`(() => {
    const short = (t) => (t == null ? "" : String(t)).replace(/\\s+/g, " ").trim().slice(0, 40);
    const links = Array.from(document.querySelectorAll('a')).map((a) => ({
      text: short(a.textContent),
      onclick: !!a.getAttribute('onclick'),
      href: short(a.getAttribute('href')),
    })).filter((l) => l.text || l.onclick);
    const inputs = Array.from(document.querySelectorAll('input[type="button"],input[type="submit"],input[type="image"],button')).map((b) => ({
      value: short(b.value || b.textContent),
      title: short(b.getAttribute('title')),
      name: short(b.getAttribute('name')),
    }));
    const selects = Array.from(document.querySelectorAll('select')).map((sel) => ({
      name: String(sel.name), optionCount: sel.options.length,
      selected: Array.from(sel.selectedOptions).map((o) => short(o.text)),
    }));
    const tables = Array.from(document.querySelectorAll('table')).map((t) => ({
      id: short(t.getAttribute('id')),
      cls: short(t.getAttribute('class')),
      rows: t.querySelectorAll('tbody tr').length,
    }));
    return { links: links.slice(0, 60), inputs: inputs.slice(0, 40), selects, tables: tables.slice(0, 20) };
  })()`);
  console.log("[court-crawler] diag-nav", JSON.stringify(snap));
}

/**
 * 空き状況グリッドのタグ骨格だけを sanitize してダンプする（原因 B 診断・#375）。
 * テキストと属性値を除去し、タグ名 + class/id + 予約画像有無だけを残すので PII は含まない。
 * ブラウザ DOM とパーサで行数の見え方が食い違う原因（ネスト構造）を突き止める。
 */
export async function snapshotGridSkeleton(page: Page): Promise<void> {
  const skeleton = await page.evaluate(`(() => {
    const pick = (el) => {
      const tag = el.tagName.toLowerCase();
      if (tag === 'img' || (tag === 'input' && el.getAttribute('type') === 'image')) {
        const src = (el.getAttribute('src') || '').split('/').pop() || '';
        return '<img ' + src + '>';
      }
      const cls = el.getAttribute('class');
      const id = el.getAttribute('id');
      let head = tag;
      if (id) head += '#' + id;
      if (cls) head += '.' + cls.replace(/\\s+/g, '.');
      const kids = Array.from(el.children).map(pick).join('');
      // テキストは出さない。子が無い要素は自己完結タグに。
      return kids ? '<' + head + '>' + kids + '</' + tag + '>' : '<' + head + '/>';
    };
    const tables = Array.from(document.querySelectorAll('table'));
    // 時間帯 thead を持つ最初のグリッド表を選ぶ（無ければ最大の表）。
    const grid = tables.find((t) => /\\d{1,2}:\\d{2}/.test(t.querySelector('thead') ? t.querySelector('thead').textContent : ''))
      || tables.sort((a,b)=>b.querySelectorAll('tr').length - a.querySelectorAll('tr').length)[0];
    if (!grid) return 'NO_TABLE';
    return pick(grid).slice(0, 6000);
  })()`);
  console.log("[court-crawler] diag-skeleton", JSON.stringify({ skeleton }));
}

/**
 * ログイン後、予約申込 → 分類（体育館系）→ 種目（バレー）→ 施設全選択 → 検索まで
 * 進め、最初の空き状況グリッドを表示する。
 *
 * ⚠️ 既定日で検索し、以降は {@link collectAvailability} が日送りで前進して集める。
 * 特定日のチェックボックスを打つ codegen の手順は日付依存のため採らない。
 *
 * @param opts.diagnose true で各選択ステップの状態を sanitize ダンプする（原因 B 診断・#375）。
 */
export async function openVolleyballGrid(
  page: Page,
  opts: { diagnose?: boolean } = {},
): Promise<void> {
  const diag = opts.diagnose
    ? (label: string) => snapshotSelection(page, label)
    : async () => undefined;
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
  await diag("facility-page (施設全選択の前)");
  step("施設 全選択");
  await page.getByRole("button", { name: "全選択" }).click();
  await diag("facility-selected (施設全選択の後)");
  step("種目を選択（バレー）");
  await page.locator('select[name="riyosmk"]').selectOption(RIYOSMK_VOLLEYBALL);
  await page
    .locator('form[name="selForm_1"]')
    .getByRole("button", { name: "確定" })
    .click();
  await diag("room-page (室場全選択の前)");
  step("室場 全選択");
  await page.getByRole("button", { name: "全選択" }).click();
  await diag("room-selected (室場全選択の後)");
  await page
    .locator('form[name="heyaform"]')
    .getByRole("button", { name: "確定" })
    .click();
  await page.waitForLoadState("networkidle").catch(() => undefined);

  // 「表示開始日選択 → 曜日」の 8 チェックボックス（DOM 順に 日月火水木金土祝日）から
  // 土・日・祝日を選び、当日以降の土日祝だけを結果に並べる（開始日は既定=当日のまま）。
  step("曜日フィルタ（土日祝）");
  const dow = page.getByRole("checkbox");
  await dow.nth(0).check(); // 日
  await dow.nth(6).check(); // 土
  await dow.nth(7).check(); // 祝日

  step("検索");
  await page.getByRole("button", { name: "検索" }).click();
  await page.waitForLoadState("networkidle").catch(() => undefined);
  // グリッド確定（空き状況セルが描画される）まで待ってから読み取りに入る。
  await page
    .locator("td.ok, td.ng, td.empty")
    .first()
    .waitFor({ state: "attached", timeout: 15000 })
    .catch(() => undefined);
  step("結果グリッド表示");
}

export interface CollectOptions {
  /** 通知に載せる予約 URL。既定はサイト入口。 */
  reserveUrl?: string;
  /** 前進して読む最大日数（暴走防止・politeness）。既定 60。 */
  maxDays?: number;
  /** 日送りクリック間の待機（ms・politeness）。既定 1000。 */
  stepDelayMs?: number;
  /**
   * 各日について、パースが読むのと同じ HTML をそのまま観測するフック（診断用）。
   * 通常運用では未指定。診断モードが sanitize 済み構造ダンプに使う。
   */
  onDay?: (html: string, slotDate: string) => void;
}

export interface CollectResult {
  /** 集約した全施設・全室場の空き枠。 */
  slots: AvailabilitySlot[];
  /** グリッドを実際に読めた日数。0 ならレイアウト破壊の疑い（結線側で parse_empty）。 */
  gridDays: number;
}

/**
 * 現在のグリッドから空き枠を読み、「次へ」リンクで前進しながら
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
    const html = await safeContent(page);
    // 表示日（令和表記）を真とする。hidden selectdate は「次へ」後に更新されない。
    const slotDate = parseReiwaDate(html) ?? parseSelectDate(html);
    if (!slotDate || seen.has(slotDate)) break;
    seen.add(slotDate);
    if (hasAvailabilityGrid(html)) gridDays++;
    opts.onDay?.(html, slotDate);
    slots.push(...parseAvailability(html, { slotDate, reserveUrl }));

    // 日送りは「次へ」リンク（#rightbutton は display:none で使えない）。
    const next = page.getByRole("link", { name: "次へ", exact: true }).first();
    if ((await next.count()) === 0 || !(await next.isVisible().catch(() => false)))
      break;
    await next.click();
    // 表示日が別日に変わるまで待つ（変わらなければ末尾とみなす）。
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
  timeoutMs = 8000,
  pollMs = 250,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const html = await safeContent(page);
    const d = parseReiwaDate(html) ?? parseSelectDate(html);
    if (d && d !== prevDate) return true;
    await page.waitForTimeout(pollMs);
  }
  return false;
}

/**
 * `page.content()` を安全に読む。クライアント再描画中は
 * 「page is navigating」で失敗するため、短い待機を挟んで数回リトライする。
 */
async function safeContent(page: Page, tries = 6, waitMs = 300): Promise<string> {
  for (let i = 0; i < tries - 1; i++) {
    try {
      return await page.content();
    } catch {
      await page.waitForTimeout(waitMs);
    }
  }
  return page.content();
}
