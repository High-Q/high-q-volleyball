import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Button from "./Button.vue";

describe("Button", () => {
  it("デフォルトで variant=primary / size=md として描画される", () => {
    const wrapper = mount(Button, { slots: { default: "確認" } });
    expect(wrapper.classes()).toContain("hq-btn--primary");
    expect(wrapper.classes()).toContain("hq-btn--md");
    expect(wrapper.text()).toContain("確認");
  });

  it("variant prop が class に反映される (outline)", () => {
    const wrapper = mount(Button, {
      props: { variant: "outline" },
      slots: { default: "OK" },
    });
    expect(wrapper.classes()).toContain("hq-btn--outline");
  });

  it("variant=ink が class に反映される (secondary-strong 用途)", () => {
    const wrapper = mount(Button, {
      props: { variant: "ink" },
      slots: { default: "送信" },
    });
    expect(wrapper.classes()).toContain("hq-btn--ink");
  });

  it("size=sm が class に反映される", () => {
    const wrapper = mount(Button, {
      props: { size: "sm" },
      slots: { default: "OK" },
    });
    expect(wrapper.classes()).toContain("hq-btn--sm");
  });

  it("disabled 時に click イベントが発火せず aria-disabled が付与される", async () => {
    const wrapper = mount(Button, {
      props: { disabled: true },
      slots: { default: "OK" },
    });
    expect(wrapper.attributes("aria-disabled")).toBe("true");
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeUndefined();
  });

  it("loading 時に aria-busy が付与され、click が発火しない", async () => {
    const wrapper = mount(Button, {
      props: { loading: true },
      slots: { default: "送信" },
    });
    expect(wrapper.attributes("aria-busy")).toBe("true");
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toBeUndefined();
  });

  it("通常状態では click イベントが発火する", async () => {
    const wrapper = mount(Button, { slots: { default: "OK" } });
    await wrapper.trigger("click");
    expect(wrapper.emitted("click")).toHaveLength(1);
  });

  it("variant=danger が class に反映される", () => {
    const wrapper = mount(Button, {
      props: { variant: "danger" },
      slots: { default: "削除" },
    });
    expect(wrapper.classes()).toContain("hq-btn--danger");
  });
});
