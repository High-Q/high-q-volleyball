import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import StatCard from "./StatCard.vue";

describe("StatCard", () => {
  it("kicker / label / value / unit を表示する", () => {
    const w = mount(StatCard, {
      props: {
        kicker: "01",
        label: "今後のイベント",
        value: 6,
        unit: "件",
      },
    });

    expect(w.text()).toContain("01");
    expect(w.text()).toContain("今後のイベント");
    expect(w.text()).toContain("6");
    expect(w.text()).toContain("件");
  });

  it("delta が空文字なら delta 表示要素は描画されない", () => {
    const w = mount(StatCard, {
      props: { kicker: "01", label: "L", value: 1 },
    });
    expect(w.find('[aria-label="先月対比"]').exists()).toBe(false);
  });

  it("delta + deltaTone='up' は up クラスで描画される", () => {
    const w = mount(StatCard, {
      props: {
        kicker: "02",
        label: "L",
        value: 12,
        delta: "+20%",
        deltaTone: "up",
      },
    });
    const delta = w.find('[aria-label="先月対比"]');
    expect(delta.exists()).toBe(true);
    expect(delta.text()).toBe("+20%");
    expect(delta.classes()).toContain("stat-card__delta--up");
  });

  it("delta + deltaTone='down' は down クラスで描画される", () => {
    const w = mount(StatCard, {
      props: {
        kicker: "02",
        label: "L",
        value: 12,
        delta: "-3%",
        deltaTone: "down",
      },
    });
    expect(
      w.find('[aria-label="先月対比"]').classes(),
    ).toContain("stat-card__delta--down");
  });

  it("deltaTone 未指定 は flat (中立) で描画", () => {
    const w = mount(StatCard, {
      props: { kicker: "02", label: "L", value: 12, delta: "— %" },
    });
    expect(
      w.find('[aria-label="先月対比"]').classes(),
    ).toContain("stat-card__delta--flat");
  });

  it("sub が空文字なら sub 行は描画されない", () => {
    const w = mount(StatCard, {
      props: { kicker: "01", label: "L", value: 1 },
    });
    expect(w.text()).not.toContain("件は満員");
  });

  it("sub が指定されたら表示される", () => {
    const w = mount(StatCard, {
      props: {
        kicker: "01",
        label: "L",
        value: 6,
        unit: "件",
        sub: "2 件は満員",
      },
    });
    expect(w.text()).toContain("2 件は満員");
  });

  it("accent=true で stat-card--accent クラスが付く", () => {
    const w = mount(StatCard, {
      props: { kicker: "01", label: "L", value: 1, accent: true },
    });
    expect(w.classes()).toContain("stat-card--accent");
  });

  it("value に文字列 (¥84,500 / —) も渡せる", () => {
    const w = mount(StatCard, {
      props: { kicker: "03", label: "L", value: "¥84,500" },
    });
    expect(w.text()).toContain("¥84,500");
  });
});
