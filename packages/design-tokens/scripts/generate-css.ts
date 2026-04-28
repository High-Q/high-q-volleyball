// HQ デザイントークン → CSS variables 変換スクリプト
//
// 使い方: pnpm --filter @high-q/design-tokens build:tokens
// 効果: src/index.ts の HQ オブジェクトから src/tokens.css を再生成する。
//
// drift 検出: src/index.test.ts で CSS variables 文字列との一致を検証している。
// 生成スクリプトは「単一の真実の源（HQ オブジェクト）→ CSS」の同期を担保する手助け。
//
// 命名規約: --hq-<category>-<kebab-name>
//   color.paper       -> --hq-color-paper
//   font.jpDisplay    -> --hq-font-jp-display
//   space[14]         -> --hq-space-14
//   radius.pill       -> --hq-radius-pill
//   shadow.sm         -> --hq-shadow-sm

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { HQ } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toKebab(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const lines: string[] = [
  "/* High Q design tokens — auto-generated from src/index.ts via scripts/generate-css.ts. Do not edit by hand. */",
  ":root {",
];

for (const [category, group] of Object.entries(HQ)) {
  for (const [name, value] of Object.entries(group as Record<string, string>)) {
    const varName = `--hq-${category}-${toKebab(name)}`;
    lines.push(`  ${varName}: ${value};`);
  }
}

lines.push("}", "");

const outPath = path.resolve(__dirname, "../src/tokens.css");
writeFileSync(outPath, lines.join("\n"), "utf8");

console.log(`[design-tokens] Generated ${path.relative(process.cwd(), outPath)}`);
