import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Label from "./Label.vue";

describe("Label", () => {
  it("基本レンダリングで <label> 要素を返す", () => {
    const wrapper = mount(Label);
    expect(wrapper.find("label").exists()).toBe(true);
  });

  it("スロットの内容を描画する", () => {
    const wrapper = mount(Label, { slots: { default: "メールアドレス" } });
    expect(wrapper.text()).toBe("メールアドレス");
  });

  it("htmlFor prop が for 属性として反映される", () => {
    const wrapper = mount(Label, { props: { htmlFor: "email-field" } });
    expect(wrapper.find("label").attributes("for")).toBe("email-field");
  });

  it("class prop で default class が上書き合成される（cn / tailwind-merge）", () => {
    const wrapper = mount(Label, { props: { class: "text-base" } });
    const cls = wrapper.find("label").attributes("class") ?? "";
    expect(cls).toContain("text-base");
  });
});
