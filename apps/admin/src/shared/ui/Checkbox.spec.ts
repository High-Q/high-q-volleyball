import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Checkbox from "./Checkbox.vue";

describe("Checkbox", () => {
  it("role=checkbox の要素をレンダリングする", () => {
    const wrapper = mount(Checkbox);
    expect(wrapper.find('[role="checkbox"]').exists()).toBe(true);
  });

  it("checked=true で aria-checked='true'", () => {
    const wrapper = mount(Checkbox, { props: { checked: true } });
    expect(wrapper.find('[role="checkbox"]').attributes("aria-checked")).toBe(
      "true",
    );
  });

  it("checked='indeterminate' で aria-checked='mixed'", () => {
    const wrapper = mount(Checkbox, { props: { checked: "indeterminate" } });
    expect(wrapper.find('[role="checkbox"]').attributes("aria-checked")).toBe(
      "mixed",
    );
  });

  it("disabled で操作不可（data-disabled / disabled 属性）", () => {
    const wrapper = mount(Checkbox, { props: { disabled: true } });
    const el = wrapper.find('[role="checkbox"]');
    expect(
      el.attributes("disabled") !== undefined ||
        el.attributes("data-disabled") !== undefined,
    ).toBe(true);
  });

  it("クリックで update:checked を発火する（v-model トグル）", async () => {
    const wrapper = mount(Checkbox, { props: { checked: false } });
    await wrapper.find('[role="checkbox"]').trigger("click");
    const events = wrapper.emitted("update:checked");
    expect(events).toBeDefined();
    expect(events?.[0]).toEqual([true]);
  });

  it("disabled のときクリックしても update:checked を発火しない", async () => {
    const wrapper = mount(Checkbox, { props: { checked: false, disabled: true } });
    await wrapper.find('[role="checkbox"]').trigger("click");
    expect(wrapper.emitted("update:checked")).toBeUndefined();
  });

  it("aria-label が root に伝播する", () => {
    const wrapper = mount(Checkbox, {
      attrs: { "aria-label": "田中 太郎 を選択" },
    });
    expect(wrapper.find('[role="checkbox"]').attributes("aria-label")).toBe(
      "田中 太郎 を選択",
    );
  });
});
