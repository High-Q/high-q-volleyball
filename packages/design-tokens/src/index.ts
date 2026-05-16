/**
 * High Q デザイントークン — 単一の真実の源泉。
 *
 * 設計参照: docs/10-デザインサンプル/admin/hq-system.jsx
 * 命名規約: TS は camelCase / CSS は --hq-<category>-<kebab-name>
 */

const color = Object.freeze({
  paper: "#f7f3ea",
  paperWarm: "#f1ece0",
  /** カード / テーブル行の表面色。paper よりわずかに明るい。 */
  surface: "#fbf8f1",
  ink: "#1f1d1a",
  inkSoft: "#3a3833",
  muted: "#8a857a",
  accent: "#b85c3c",
  accentSoft: "rgba(184,92,60,0.08)",
  hairline: "rgba(31,29,26,0.12)",
  /** カード内側の subtle な区切り線用 (hairline の半分の濃さ)。 */
  hairlineSoft: "rgba(31,29,26,0.06)",
  // semantic colors (HQ アース調に揃えた渋めの配色)
  success: "#6b7e4f",
  successSoft: "rgba(107,126,79,0.10)",
  warn: "#c08442",
  warnSoft: "rgba(192,132,66,0.10)",
  danger: "#9c4030",
  dangerSoft: "rgba(156,64,48,0.10)",
});

const font = Object.freeze({
  jpDisplay: '"Klee One", "Shippori Mincho", "Noto Serif JP", serif',
  jp: '"Zen Kaku Gothic New", "Noto Sans JP", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
});

const space = Object.freeze({
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  /** 設計サンプル準拠の card 上部 padding (20px)。 */
  5: "20px",
  6: "24px",
  8: "32px",
  14: "56px",
});

const radius = Object.freeze({
  none: "0",
  sm: "4px",
  /** 設計サンプル準拠の card 角丸 (radiusLg = 10px)。 */
  lg: "10px",
  md: "12px",
  pill: "999px",
});

const shadow = Object.freeze({
  none: "none",
  sm: "0 1px 2px rgba(31,29,26,0.04), 0 1px 1px rgba(31,29,26,0.06)",
  md: "0 4px 12px rgba(31,29,26,0.06), 0 2px 4px rgba(31,29,26,0.04)",
});

export const HQ = Object.freeze({
  color,
  font,
  space,
  radius,
  shadow,
});

export type HQColorKey = keyof typeof color;
export type HQFontKey = keyof typeof font;
export type HQSpaceKey = keyof typeof space;
export type HQRadiusKey = keyof typeof radius;
export type HQShadowKey = keyof typeof shadow;
