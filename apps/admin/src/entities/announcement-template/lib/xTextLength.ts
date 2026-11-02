/**
 * X（旧 Twitter）の投稿文字数を X の数え方で数える (#386)。
 *
 * twitter-text v3 の既定設定に沿った重み付け（依存ライブラリは増やさない）:
 * - `http://` / `https://` で始まる連続文字列 = 1 つあたり 23（t.co 短縮後の長さ）
 * - 絵文字 = 書記素単位で 2
 * - U+0000〜U+10FF / U+2000〜U+200D / U+2010〜U+201F / U+2032〜U+2037 = 1
 * - それ以外（日本語等）= 2
 *
 * spec: openspec/changes/line-announcement-copy/specs/admin-announcement/spec.md
 *   「X の文字数カウント」
 */

/** X の投稿上限（無料アカウント）。Premium はより長く投稿できる */
export const X_MAX_WEIGHTED = 280;

const URL_WEIGHT = 23;
const URL_PATTERN = /https?:\/\/[^\s]+/g;
const EMOJI_PATTERN = /\p{Extended_Pictographic}/u;

const LIGHT_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x0000, 0x10ff],
  [0x2000, 0x200d],
  [0x2010, 0x201f],
  [0x2032, 0x2037],
];

const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

function codePointWeight(cp: number): number {
  return LIGHT_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi) ? 1 : 2;
}

function countWithoutUrls(text: string): number {
  let total = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (EMOJI_PATTERN.test(segment)) {
      total += 2;
      continue;
    }
    for (const ch of segment) {
      total += codePointWeight(ch.codePointAt(0) ?? 0);
    }
  }
  return total;
}

export function countXWeightedLength(text: string): number {
  const urls = text.match(URL_PATTERN) ?? [];
  const rest = text.replace(URL_PATTERN, "");
  return countWithoutUrls(rest) + urls.length * URL_WEIGHT;
}
