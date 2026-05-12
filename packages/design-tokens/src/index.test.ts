import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { HQ } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toKebab(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

describe("HQ design tokens — color", () => {
  it("paper / paperWarm / ink / inkSoft / muted の値が設計サンプルと一致する", () => {
    expect(HQ.color.paper).toBe("#f7f3ea");
    expect(HQ.color.paperWarm).toBe("#f1ece0");
    expect(HQ.color.ink).toBe("#1f1d1a");
    expect(HQ.color.inkSoft).toBe("#3a3833");
    expect(HQ.color.muted).toBe("#8a857a");
  });

  it("accent / accentSoft / hairline の値が設計サンプルと一致する", () => {
    // accent は WCAG AA 確保のため #b85c3c → #a44e30 にトーン調整済み (Issue #238)
    expect(HQ.color.accent).toBe("#a44e30");
    expect(HQ.color.accentSoft).toBe("rgba(164,78,48,0.08)");
    expect(HQ.color.hairline).toBe("rgba(31,29,26,0.12)");
  });

  it("セマンティックカラー (success / warn / danger) と soft 版が定義されている", () => {
    expect(HQ.color.success).toBe("#6b7e4f");
    expect(HQ.color.successSoft).toBe("rgba(107,126,79,0.10)");
    // warn は accent と色相が近すぎたため #c08442 → #d4a04a (マスタード) に振り直し (Issue #238)
    expect(HQ.color.warn).toBe("#d4a04a");
    expect(HQ.color.warnSoft).toBe("rgba(212,160,74,0.10)");
    expect(HQ.color.danger).toBe("#9c4030");
    expect(HQ.color.dangerSoft).toBe("rgba(156,64,48,0.10)");
  });
});

describe("HQ design tokens — font", () => {
  it("jpDisplay は Klee One を含む font-family 文字列である", () => {
    expect(HQ.font.jpDisplay).toContain("Klee One");
  });

  it("jp は Zen Kaku Gothic New を含む", () => {
    expect(HQ.font.jp).toContain("Zen Kaku Gothic New");
  });

  it("mono は JetBrains Mono を含む", () => {
    expect(HQ.font.mono).toContain("JetBrains Mono");
  });
});

describe("HQ design tokens — space (8pt grid)", () => {
  it("1 / 2 / 3 / 4 / 6 / 8 / 14 がピクセル値で定義されている", () => {
    expect(HQ.space[1]).toBe("4px");
    expect(HQ.space[2]).toBe("8px");
    expect(HQ.space[3]).toBe("12px");
    expect(HQ.space[4]).toBe("16px");
    expect(HQ.space[6]).toBe("24px");
    expect(HQ.space[8]).toBe("32px");
    expect(HQ.space[14]).toBe("56px");
  });
});

describe("HQ design tokens — radius", () => {
  it("none / sm / md / pill が定義されている", () => {
    expect(HQ.radius.none).toBe("0");
    expect(HQ.radius.sm).toBe("4px");
    expect(HQ.radius.md).toBe("12px");
    expect(HQ.radius.pill).toBe("999px");
  });
});

describe("HQ design tokens — shadow", () => {
  it("none / sm / md が定義されている", () => {
    expect(HQ.shadow.none).toBe("none");
    expect(typeof HQ.shadow.sm).toBe("string");
    expect(typeof HQ.shadow.md).toBe("string");
    expect(HQ.shadow.sm.length).toBeGreaterThan(0);
    expect(HQ.shadow.md.length).toBeGreaterThan(0);
  });
});

describe("HQ design tokens — frozen / immutable", () => {
  it("ルートオブジェクトは凍結されている（誤改変防止）", () => {
    expect(Object.isFrozen(HQ)).toBe(true);
    expect(Object.isFrozen(HQ.color)).toBe(true);
    expect(Object.isFrozen(HQ.font)).toBe(true);
  });
});

describe("HQ tokens ↔ tokens.css drift detection", () => {
  const cssPath = path.resolve(__dirname, "tokens.css");
  const css = readFileSync(cssPath, "utf8");

  it("HQ オブジェクトの全エントリが tokens.css に CSS variable として存在する (drift 検出)", () => {
    const missing: string[] = [];
    for (const [category, group] of Object.entries(HQ)) {
      for (const [name, value] of Object.entries(group as Record<string, string>)) {
        const varName = `--hq-${category}-${toKebab(name)}`;
        const expected = `${varName}: ${value};`;
        if (!css.includes(expected)) {
          missing.push(expected);
        }
      }
    }
    expect(missing, `tokens.css に未反映: ${missing.join(", ")}\npnpm --filter @high-q/design-tokens build:tokens で再生成してください`).toEqual([]);
  });
});
