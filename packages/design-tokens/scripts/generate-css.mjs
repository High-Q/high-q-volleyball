// HQ デザイントークン → CSS variables 変換スクリプト
//
// dist/index.js（tsc 出力後）から HQ オブジェクトを読み、
// :root { --hq-color-paper: #f7f3ea; ... } 形式の CSS を dist/tokens.css に出力する。
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distEntry = path.resolve(__dirname, "../dist/index.js");

const { HQ } = await import(distEntry);

/** camelCase -> kebab-case */
function toKebab(input) {
  return String(input).replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

const lines = [
  "/* High Q design tokens — auto-generated from packages/design-tokens/src/index.ts. Do not edit by hand. */",
  ":root {",
];

for (const [category, group] of Object.entries(HQ)) {
  for (const [name, value] of Object.entries(group)) {
    const varName = `--hq-${category}-${toKebab(name)}`;
    lines.push(`  ${varName}: ${value};`);
  }
}

lines.push("}", "");

const outPath = path.resolve(__dirname, "../dist/tokens.css");
writeFileSync(outPath, lines.join("\n"), "utf8");

console.log(`[design-tokens] Generated ${path.relative(process.cwd(), outPath)}`);
