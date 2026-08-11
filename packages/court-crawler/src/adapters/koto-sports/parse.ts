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
 * テーブルが空き状況グリッドなら列（時間帯）配列を返す。thead の全 th が
 * 時刻を持つものだけを対象にし、「日付/時間/室場名」の予約リストは弾く。
 * グリッドでなければ null。
 */
function availabilityRanges(table: HTMLElement): TimeRange[] | null {
  const thead = table.querySelector("thead");
  if (!thead) return null;
  const ths = thead.querySelectorAll("th");
  if (ths.length === 0) return null;
  const ranges: TimeRange[] = [];
  for (const th of ths) {
    const r = extractTimeRange(th);
    if (!r) return null;
    ranges.push(r);
  }
  return ranges;
}

/**
 * 少なくとも 1 つの空き状況グリッド（時間帯 thead + 会場行）が存在するか。
 * 「全埋まり（空きゼロ）」と「レイアウト破壊（グリッド無し）」を結線側で
 * 区別するのに使う（前者は grid あり・後者は grid なし）。
 */
export function hasAvailabilityGrid(html: string): boolean {
  const root = parse(html);
  for (const table of root.querySelectorAll("table")) {
    if (!availabilityRanges(table)) continue;
    for (const tbody of table.querySelectorAll("tbody")) {
      for (const row of tbody.querySelectorAll("tr")) {
        const head = row.querySelector("th");
        if (head && extractVenueName(head)) return true;
      }
    }
  }
  return false;
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
 * 結果ページに表示されている「令和○年○月○日」を `YYYY-MM-DD` にして返す。
 * 令和 N 年 = 2018 + N。会員情報の「有効期限 …まで」を拾わないよう `まで` を除外する。
 * 「次へ」ナビ後は hidden `selectdate` が更新されないため、表示日を真とする。
 */
export function parseReiwaDate(html: string): string | null {
  const m = /令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日(?!\s*まで)/.exec(html);
  if (!m) return null;
  const year = 2018 + Number(m[1]);
  const mm = String(Number(m[2])).padStart(2, "0");
  const dd = String(Number(m[3])).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** セル内に予約導線（空きに現れる予約ボタン画像）があるか。 */
function hasReserveImage(cell: HTMLElement): boolean {
  for (const el of cell.querySelectorAll("[src]")) {
    if ((el.getAttribute("src") ?? "").includes("timetable-o.gif")) return true;
  }
  return false;
}

/**
 * セルが「空き」か。実サイトは空きセルに class を付けなくなり（旧 `ok` は消滅）、
 * 予約ボタン画像（`timetable-o.gif`）だけで空きを表す。埋まりは `ng`、対象外は `empty`。
 * class 依存に戻すと再び静かに 0 件化するため、予約導線を主シグナルにする（旧 `ok` も後方互換で許容）。
 */
function isAvailableCell(cell: HTMLElement): boolean {
  const classes = (cell.getAttribute("class") ?? "").split(/\s+/);
  if (classes.includes("ng") || classes.includes("empty")) return false;
  return hasReserveImage(cell) || classes.includes("ok");
}

/**
 * 空き状況グリッド HTML から空き枠（予約導線のあるセル）を抽出する。
 *
 * グリッドは「列 = 時間帯（thead の th）/ 行 = 施設・室場（室場ごとの tbody 行頭 th）/
 * セル = 空き状況（td）」の構造。空きは予約導線（{@link isAvailableCell}）で判定し、
 * 埋まりは `ng`・対象外は `empty`。thead の各 th から時間帯を、各行から会場名を取り、
 * 空きセルの列位置を時間帯に対応づけて枠を作る。室場ごとに tbody が分かれるため全 tbody を走査する。
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
    const ranges = availabilityRanges(table);
    if (!ranges) continue;

    // グリッドは「1 テーブル × 室場ごとの tbody」構造。最初の tbody だけでなく
    // 全 tbody を走査しないと 1 室場しか拾えない（実サイトは施設×室場で 13 tbody）。
    for (const tbody of table.querySelectorAll("tbody")) {
      for (const row of tbody.querySelectorAll("tr")) {
        const head = row.querySelector("th");
        if (!head) continue;
        const venueName = extractVenueName(head);
        if (!venueName) continue;

        row.querySelectorAll("td").forEach((cell, i) => {
          if (!isAvailableCell(cell)) return;
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
  }

  return slots;
}
