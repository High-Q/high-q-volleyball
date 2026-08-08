import { parse, type HTMLElement } from "node-html-parser";
import type { AvailabilitySlot } from "../../core/types.js";

/** 江東区アダプタの既定施設識別子。 */
export const KOTO_FACILITY = "koto-sports";

export interface ParseAvailabilityOptions {
  /**
   * このグリッドが表す暦日（`YYYY-MM-DD`・JST）。
   * 空き状況ページは 1 日分しか描画せず日付を DOM に持たないため、
   * アダプタが遷移した対象日を渡す。
   */
  slotDate: string;
  /** 通知に載せる予約 URL（枠署名には含めない）。 */
  reserveUrl: string;
  /** 施設識別子。既定は `koto-sports`。 */
  facility?: string;
}

interface TimeRange {
  /** `HH:MM`（24h）。 */
  start: string;
  end: string;
}

/** 全角スペース含む連続空白を半角 1 つに畳み、前後を除去する。 */
function normalizeSpace(text: string): string {
  return text.replace(/[\s　]+/g, " ").trim();
}

/** `HH:MM` を 2 桁時にそろえる（`9:00` → `09:00`）。 */
function padTime(hm: string): string {
  const [h, m] = hm.split(":");
  return `${(h ?? "").padStart(2, "0")}:${m ?? "00"}`;
}

/** thead の時間帯セルから開始・終了を取り出す。時刻が 2 つ未満なら null。 */
function extractTimeRange(th: HTMLElement): TimeRange | null {
  const times = th.text.match(/\d{1,2}:\d{2}/g);
  if (!times || times.length < 2) return null;
  return { start: padTime(times[0]!), end: padTime(times[times.length - 1]!) };
}

/** tbody 行頭の th から「施設名 室場名」を組み立てる。 */
function extractVenueName(head: HTMLElement): string {
  const strong = head.querySelector("strong");
  const facilityName = strong ? normalizeSpace(strong.text) : "";
  if (strong) strong.remove();
  const room = normalizeSpace(head.text);
  return normalizeSpace(`${facilityName} ${room}`);
}

/**
 * 結果 HTML が表示している暦日を `<input name="selectdate" value="YYYYMMDD">`
 * から取り出し `YYYY-MM-DD` で返す。値ありの selectdate が無ければ null。
 * driver がナビゲーション後の「今どの日を見ているか」を自己判定するのに使う。
 */
export function parseSelectDate(html: string): string | null {
  const root = parse(html);
  for (const input of root.querySelectorAll('input[name="selectdate"]')) {
    const v = input.getAttribute("value") ?? "";
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  return null;
}

/**
 * 空き状況グリッド HTML から空き枠（`class="ok"` のセル）を抽出する。
 *
 * グリッドは「列 = 時間帯（thead の th）/ 行 = 施設・室場（tbody 行頭の th）/
 * セル = 空き状況（td, class ok|ng|empty）」の構造。thead の各 th から時間帯を、
 * tbody の各行から会場名を取り、`ok` セルの列位置を時間帯に対応づけて枠を作る。
 *
 * 監視対象（大体育室 半面のみ 等）への絞り込みはアダプタ結線側の責務とし、
 * ここでは見つかった空き枠をすべて返す純粋関数に徹する。
 * グリッドが無い／壊れた HTML でも例外は投げず空配列を返す。
 */
export function parseAvailability(
  html: string,
  opts: ParseAvailabilityOptions,
): AvailabilitySlot[] {
  const facility = opts.facility ?? KOTO_FACILITY;
  const root = parse(html);
  const slots: AvailabilitySlot[] = [];

  for (const table of root.querySelectorAll("table")) {
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    if (!thead || !tbody) continue;

    // 時間帯列。全 th が時刻を持つグリッドだけを対象にする
    // （「日付/時間/室場名」の予約リストはここで弾かれる）。
    const ranges = thead.querySelectorAll("th").map(extractTimeRange);
    if (ranges.length === 0 || ranges.some((r) => r === null)) continue;

    for (const row of tbody.querySelectorAll("tr")) {
      const head = row.querySelector("th");
      if (!head) continue;
      const venueName = extractVenueName(head);
      if (!venueName) continue;

      row.querySelectorAll("td").forEach((cell, i) => {
        const cls = (cell.getAttribute("class") ?? "").split(/\s+/);
        if (!cls.includes("ok")) return;
        const range = ranges[i];
        if (!range) return;
        slots.push({
          facility,
          venueName,
          slotDate: opts.slotDate,
          startAt: `${opts.slotDate}T${range.start}:00+09:00`,
          endAt: `${opts.slotDate}T${range.end}:00+09:00`,
          reserveUrl: opts.reserveUrl,
        });
      });
    }
  }

  return slots;
}
