import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Kicker from "./Kicker.vue";

describe("Kicker", () => {
  it("デフォルトで accent 色クラスが付与される", () => {
    const wrapper = mount(Kicker, { slots: { default: "EVENT" } });
    expect(wrapper.classes()).toContain("hq-kicker");
    expect(wrapper.classes()).toContain("hq-kicker--accent");
    expect(wrapper.text()).toBe("EVENT");
  });

  it("color='ink' でインクカラークラスに切り替わる", () => {
    const wrapper = mount(Kicker, {
      props: { color: "ink" },
      slots: { default: "TAG" },
    });
    expect(wrapper.classes()).toContain("hq-kicker--ink");
    expect(wrapper.classes()).not.toContain("hq-kicker--accent");
  });

  it("color='muted' で muted カラークラスに切り替わる", () => {
    const wrapper = mount(Kicker, {
      props: { color: "muted" },
      slots: { default: "TAG" },
    });
    expect(wrapper.classes()).toContain("hq-kicker--muted");
  });

  it("デフォルトのタグは div である", () => {
    const wrapper = mount(Kicker, { slots: { default: "X" } });
    expect(wrapper.element.tagName).toBe("DIV");
  });
});
