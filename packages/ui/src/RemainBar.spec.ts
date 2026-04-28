import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import RemainBar from "./RemainBar.vue";

describe("RemainBar", () => {
  it("残席多めでは normal モードのクラスが付与される", () => {
    const wrapper = mount(RemainBar, {
      props: { capacity: 20, taken: 5 },
    });
    expect(wrapper.classes()).toContain("hq-remain");
    expect(wrapper.classes()).toContain("hq-remain--normal");
    expect(wrapper.text()).toContain("残 15 / 20");
  });

  it("残席率が低い場合は warning モードに切り替わる", () => {
    const wrapper = mount(RemainBar, {
      props: { capacity: 20, taken: 18 },
    });
    expect(wrapper.classes()).toContain("hq-remain--warning");
    expect(wrapper.text()).toContain("残 2 / 20");
  });

  it("満席時は full モードかつ「満席」表示になる", () => {
    const wrapper = mount(RemainBar, {
      props: { capacity: 20, taken: 20 },
    });
    expect(wrapper.classes()).toContain("hq-remain--full");
    expect(wrapper.text()).toContain("満席");
    expect(wrapper.text()).not.toContain("残 0 / 20");
  });

  it("バーの fill 幅が taken / capacity を反映する", () => {
    const wrapper = mount(RemainBar, {
      props: { capacity: 20, taken: 10 },
    });
    const fill = wrapper.find(".hq-remain__fill");
    expect(fill.exists()).toBe(true);
    expect(fill.attributes("style")).toContain("width: 50%");
  });

  it("aria-valuenow / aria-valuemax が設定される", () => {
    const wrapper = mount(RemainBar, {
      props: { capacity: 20, taken: 14 },
    });
    expect(wrapper.attributes("role")).toBe("progressbar");
    expect(wrapper.attributes("aria-valuenow")).toBe("14");
    expect(wrapper.attributes("aria-valuemax")).toBe("20");
  });

  it("超過予約 (taken > capacity) でも 100% で頭打ちになる", () => {
    const wrapper = mount(RemainBar, {
      props: { capacity: 20, taken: 25 },
    });
    expect(wrapper.classes()).toContain("hq-remain--full");
    const fill = wrapper.find(".hq-remain__fill");
    expect(fill.attributes("style")).toContain("width: 100%");
  });
});
