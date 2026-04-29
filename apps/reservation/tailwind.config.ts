import type { Config } from "tailwindcss";
import hqPreset from "@high-q/tailwind-preset";

/**
 * apps/reservation の Tailwind 設定。
 *
 * HQ デザイントークンは @high-q/tailwind-preset の preset 経由で
 * theme.extend に取り込む。preset 内に値の真実の源（HQ object）が
 * 一元化されているため、個別に theme を上書きしない。
 *
 * 関連: openspec/specs/tailwind-preset/ (archive 後)
 *       openspec/changes/admin-reservation-ui-foundation/design.md (D2/D3)
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{vue,ts,tsx}"],
  presets: [hqPreset],
};

export default config;
