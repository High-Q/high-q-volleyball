import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import FormSection from "./FormSection.vue";

describe("FormSection", () => {
  it("kicker / title / hint を描画する", () => {
    const wrapper = mount(FormSection, {
      props: { kicker: "01", title: "基本情報", hint: "ヒント説明" },
      slots: { default: () => h("div", { id: "slot-content" }, "child") },
    });
    expect(wrapper.text()).toContain("01");
    expect(wrapper.text()).toContain("基本情報");
    expect(wrapper.text()).toContain("ヒント説明");
  });

  it("default slot に子要素を表示する", () => {
    const wrapper = mount(FormSection, {
      props: { kicker: "01", title: "基本情報" },
      slots: { default: () => h("div", { id: "slot-content" }, "child") },
    });
    expect(wrapper.find("#slot-content").exists()).toBe(true);
    expect(wrapper.find("#slot-content").text()).toBe("child");
  });

  it("hint 未指定なら hint 段落は描画されない", () => {
    const wrapper = mount(FormSection, {
      props: { kicker: "01", title: "基本情報" },
      slots: { default: () => h("div", null, "x") },
    });
    const ps = wrapper.findAll("p");
    expect(ps).toHaveLength(0);
  });

  it("section タグが root", () => {
    const wrapper = mount(FormSection, {
      props: { kicker: "01", title: "基本情報" },
    });
    expect(wrapper.element.tagName).toBe("SECTION");
  });
});
