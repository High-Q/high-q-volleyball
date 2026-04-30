import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Skeleton from "./Skeleton.vue";

describe("Skeleton", () => {
  it("基本レンダリングで <div> を返す", () => {
    const wrapper = mount(Skeleton);
    expect(wrapper.find("div").exists()).toBe(true);
  });

  it("aria-hidden が true で付与される", () => {
    const wrapper = mount(Skeleton);
    expect(wrapper.find("div").attributes("aria-hidden")).toBe("true");
  });

  it("animate-pulse class を含む", () => {
    const wrapper = mount(Skeleton);
    expect(wrapper.find("div").classes()).toContain("animate-pulse");
  });

  it("class prop が追加される", () => {
    const wrapper = mount(Skeleton, { props: { class: "h-4 w-20" } });
    const classes = wrapper.find("div").classes();
    expect(classes).toContain("h-4");
    expect(classes).toContain("w-20");
  });
});
