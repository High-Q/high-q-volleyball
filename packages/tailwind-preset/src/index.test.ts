import { describe, expect, it } from "vitest";
import { HQ } from "@high-q/design-tokens";
import preset from "./index.js";

/**
 * preset の整合性テスト。
 *
 * 目的: `@high-q/design-tokens` の HQ object が preset の theme.extend に
 * 正しく反映されていることを保証する。値の真実の源は HQ object 一つ。
 */
describe("@high-q/tailwind-preset", () => {
  describe("colors (kebab-case 展開)", () => {
    it("HQ.color の各キーを kebab-case で colors に展開する", () => {
      const colors = preset.theme.extend.colors;
      expect(colors.paper).toBe(HQ.color.paper);
      expect(colors["paper-warm"]).toBe(HQ.color.paperWarm);
      expect(colors.ink).toBe(HQ.color.ink);
      expect(colors["ink-soft"]).toBe(HQ.color.inkSoft);
      expect(colors.muted).toBe(HQ.color.muted);
      expect(colors.accent).toBe(HQ.color.accent);
      expect(colors["accent-soft"]).toBe(HQ.color.accentSoft);
      expect(colors.hairline).toBe(HQ.color.hairline);
      expect(colors.success).toBe(HQ.color.success);
      expect(colors["success-soft"]).toBe(HQ.color.successSoft);
      expect(colors.warn).toBe(HQ.color.warn);
      expect(colors["warn-soft"]).toBe(HQ.color.warnSoft);
      expect(colors.danger).toBe(HQ.color.danger);
      expect(colors["danger-soft"]).toBe(HQ.color.dangerSoft);
    });

    it("dark トーン色を kebab-case で展開する (Issue #305)", () => {
      const colors = preset.theme.extend.colors;
      expect(colors["success-on-dark"]).toBe(HQ.color.successOnDark);
      expect(colors["warn-on-dark"]).toBe(HQ.color.warnOnDark);
      expect(colors["danger-on-dark"]).toBe(HQ.color.dangerOnDark);
    });
  });

  describe("fontFamily (kebab-case 展開)", () => {
    it("HQ.font の各キーを kebab-case で fontFamily に展開する", () => {
      const fonts = preset.theme.extend.fontFamily;
      expect(fonts.jp).toBe(HQ.font.jp);
      expect(fonts["jp-display"]).toBe(HQ.font.jpDisplay);
      expect(fonts.mono).toBe(HQ.font.mono);
    });
  });

  describe("spacing (`hq-` prefix)", () => {
    it("HQ.space を `hq-` prefix で spacing に展開する", () => {
      const spacing = preset.theme.extend.spacing;
      expect(spacing["hq-1"]).toBe(HQ.space[1]);
      expect(spacing["hq-2"]).toBe(HQ.space[2]);
      expect(spacing["hq-3"]).toBe(HQ.space[3]);
      expect(spacing["hq-4"]).toBe(HQ.space[4]);
      expect(spacing["hq-6"]).toBe(HQ.space[6]);
      expect(spacing["hq-8"]).toBe(HQ.space[8]);
      expect(spacing["hq-14"]).toBe(HQ.space[14]);
    });

    it("Tailwind デフォルト spacing と衝突しないキー命名である", () => {
      const spacing = preset.theme.extend.spacing;
      // すべてのキーが `hq-` で始まる
      for (const key of Object.keys(spacing)) {
        expect(key.startsWith("hq-")).toBe(true);
      }
    });
  });

  describe("borderRadius (`hq-` prefix)", () => {
    it("HQ.radius を `hq-` prefix で borderRadius に展開する", () => {
      const radius = preset.theme.extend.borderRadius;
      expect(radius["hq-none"]).toBe(HQ.radius.none);
      expect(radius["hq-sm"]).toBe(HQ.radius.sm);
      expect(radius["hq-md"]).toBe(HQ.radius.md);
      expect(radius["hq-pill"]).toBe(HQ.radius.pill);
    });
  });

  describe("boxShadow (`hq-` prefix)", () => {
    it("HQ.shadow を `hq-` prefix で boxShadow に展開する", () => {
      const shadow = preset.theme.extend.boxShadow;
      expect(shadow["hq-none"]).toBe(HQ.shadow.none);
      expect(shadow["hq-sm"]).toBe(HQ.shadow.sm);
      expect(shadow["hq-md"]).toBe(HQ.shadow.md);
    });
  });

  describe("リテラル値の単一の真実の源", () => {
    it("preset 内の値は HQ object と完全一致する（リテラル直書き禁止の確認）", () => {
      // colors: HQ.color の全キーが kebab-case で展開され、値が一致
      const colors = preset.theme.extend.colors;
      for (const [key, value] of Object.entries(HQ.color)) {
        const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
        expect(colors[kebabKey]).toBe(value);
      }
    });
  });
});
