import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Badge from "./Badge.vue";

describe("Badge", () => {
  it("tone 未指定時は neutral クラスが付与される", () => {
    const wrapper = mount(Badge, { slots: { default: "下書き" } });
    expect(wrapper.classes()).toContain("hq-badge");
    expect(wrapper.classes()).toContain("hq-badge--neutral");
    expect(wrapper.text()).toBe("下書き");
  });

  it.each([
    ["accent", "hq-badge--accent"],
    ["success", "hq-badge--success"],
    ["warn", "hq-badge--warn"],
    ["danger", "hq-badge--danger"],
    ["draft", "hq-badge--draft"],
  ] as const)("tone='%s' で対応するクラスが付与される", (tone, expectedClass) => {
    const wrapper = mount(Badge, {
      props: { tone },
      slots: { default: "x" },
    });
    expect(wrapper.classes()).toContain(expectedClass);
  });

  it("success と danger は視覚的に区別できる（クラスが異なる）", () => {
    const success = mount(Badge, { props: { tone: "success" }, slots: { default: "OK" } });
    const danger = mount(Badge, { props: { tone: "danger" }, slots: { default: "NG" } });
    expect(success.classes()).not.toEqual(danger.classes());
  });
});
