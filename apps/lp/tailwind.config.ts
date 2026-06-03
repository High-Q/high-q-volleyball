import type { Config } from "tailwindcss";
import hqPreset from "@high-q/tailwind-preset";

/**
 * apps/lp の Tailwind 設定。
 *
 * HQ デザイントークンは @high-q/tailwind-preset の preset 経由で
 * theme.extend に取り込む。admin / reservation と同じ preset を使うことで
 * 3 アプリ間でユーティリティクラス名・トークン値が完全に揃う。
 *
 * 関連: openspec/changes/lp-vuetify-to-hq-design-system/design.md (D2)
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  presets: [hqPreset],
};

export default config;
