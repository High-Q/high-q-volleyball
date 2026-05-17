import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import HeroFirst from "../ui/HeroFirst.vue";

// jsdom rewrites `import.meta.url` to an http: URL, so resolve from cwd
// (vitest runs from `apps/lp/`) to read the SFC source as a string.
const heroFirstSource = readFileSync(
  resolve(process.cwd(), "src/widgets/hero-first/ui/HeroFirst.vue"),
  "utf8",
);

function mountHero() {
  return mount(HeroFirst, {
    global: {
      stubs: {
        Photo: { template: '<div data-stub="photo" />' },
        Button: { template: "<button><slot /></button>" },
      },
    },
  });
}

describe("HeroFirst", () => {
  it("renders all primary text elements (kicker / heading / lead / CTA / meta)", () => {
    const wrapper = mountHero();

    expect(wrapper.find(".hero-first__kicker").exists()).toBe(true);
    expect(wrapper.find(".hero-first__heading").exists()).toBe(true);
    expect(wrapper.find(".hero-first__lead").exists()).toBe(true);
    expect(wrapper.find(".hero-first__meta").exists()).toBe(true);

    expect(wrapper.text()).toContain("だいじょうぶ");
    expect(wrapper.text()).toContain("イベントを見る");
    expect(wrapper.text()).toContain("所要 1分");
    expect(wrapper.text()).toContain("月1〜2回開催");
    expect(wrapper.text()).toContain("参加費 500円");
  });

  it("does not apply max-height to .hero-first__body (would clip meta text under overflow:hidden)", () => {
    // vitest config has `css: false`, so scoped CSS cannot be evaluated via
    // getComputedStyle. Inspect the SFC source instead to guarantee the
    // regression vector (`max-height` on .hero-first__body) is gone for good.
    const bodyBlockMatch = heroFirstSource.match(
      /\.hero-first__body\s*\{([^}]*)\}/,
    );
    expect(bodyBlockMatch, ".hero-first__body block must exist").not.toBeNull();
    const bodyBlock = bodyBlockMatch[1];
    expect(bodyBlock).not.toMatch(/max-height\s*:/);
  });

  it("uses min-height (not fixed height) on .hero-first so the section follows content", () => {
    // Same rationale as above: source-level assertion for the structural rule.
    const heroBlocks = [
      ...heroFirstSource.matchAll(/\.hero-first\s*\{([^}]*)\}/g),
    ];
    expect(heroBlocks.length, ".hero-first block must exist").toBeGreaterThan(0);

    for (const match of heroBlocks) {
      const block = match[1];
      // Forbid `height: <fixed>` declarations on .hero-first. min-height is OK.
      const hasFixedHeight = /(^|[\s;])height\s*:/.test(block);
      expect(hasFixedHeight, `.hero-first must not declare fixed height: ${block.trim()}`).toBe(false);
      expect(block).toMatch(/min-height\s*:/);
    }
  });
});
