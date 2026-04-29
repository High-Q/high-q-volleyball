/**
 * @high-q/tailwind-preset
 *
 * HQ デザイントークン（`@high-q/design-tokens`）を Tailwind CSS の
 * `theme.extend` 形式で配布する preset。`apps/admin` / `apps/reservation`
 * （および将来の LP 移行）が `tailwind.config.ts` で `presets: [hqPreset]`
 * として取り込んで利用する。
 *
 * 設計判断: openspec/changes/admin-reservation-ui-foundation/design.md
 *   D2  preset 配布形式の選択
 *   D3  HQ tokens → Tailwind theme のマッピング規則（`hq-` prefix）
 *
 * 値の真実の源は `HQ` object（`packages/design-tokens`）一つ。preset 内に
 * リテラル色（`#xxxxxx` / `rgb()` 等）を直書きしない。
 */

import { HQ } from "@high-q/design-tokens";

/** camelCase キーを kebab-case に変換する（paperWarm → paper-warm）。 */
const camelToKebab = (key: string): string =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** Object のキーを kebab-case に変換した新しい Object を返す。 */
const remapKeysToKebab = <T>(obj: Readonly<Record<string, T>>): Record<string, T> =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [camelToKebab(k), v]));

/**
 * Object のキーに固定 prefix を付けた新しい Object を返す。
 * 数値キー（`HQ.space[4]` 等）も string 化して prefix を付ける。
 */
const prefixKeys = <T>(
  obj: Readonly<Record<string | number, T>>,
  prefix: string,
): Record<string, T> =>
  Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [`${prefix}${k}`, v]),
  );

/**
 * Tailwind preset の本体。Tailwind デフォルト theme は温存し、
 * `extend` で HQ トークンを追加する（置換ではなく追加）。
 *
 * 命名規則:
 *   - colors / fontFamily   → kebab-case（Tailwind 慣例の color 命名と整合）
 *   - spacing / borderRadius / boxShadow → `hq-` prefix（Tailwind デフォルト
 *     と key で明示的に区別。例: `p-4`(Tailwind 16px) vs `p-hq-4`(HQ 16px)）
 */
const hqPreset = {
  theme: {
    extend: {
      colors: remapKeysToKebab(HQ.color),
      fontFamily: remapKeysToKebab(HQ.font),
      spacing: prefixKeys(HQ.space, "hq-"),
      borderRadius: prefixKeys(HQ.radius, "hq-"),
      boxShadow: prefixKeys(HQ.shadow, "hq-"),
    },
  },
} as const;

export default hqPreset;
export { hqPreset };
