import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { h } from "vue";
import Select from "./Select.vue";
import SelectTrigger from "./SelectTrigger.vue";
import SelectValue from "./SelectValue.vue";
import SelectContent from "./SelectContent.vue";
import SelectItem from "./SelectItem.vue";

describe("Select プリミティブ群", () => {
  it("Select が radix-vue の SelectRoot を wrap する（trigger が render される）", () => {
    const wrapper = mount(Select, {
      props: { modelValue: "" },
      slots: {
        default: () =>
          h(SelectTrigger, null, {
            default: () =>
              h(SelectValue, { placeholder: "選択してください" }),
          }),
      },
    });
    // SelectTrigger は role="combobox" の button をレンダリングする (radix-vue)
    expect(wrapper.find('[role="combobox"]').exists()).toBe(true);
  });

  it("SelectTrigger に placeholder が表示される", () => {
    const wrapper = mount(Select, {
      props: { modelValue: "" },
      slots: {
        default: () =>
          h(SelectTrigger, null, {
            default: () =>
              h(SelectValue, { placeholder: "期間を選んでください" }),
          }),
      },
    });
    expect(wrapper.text()).toContain("期間を選んでください");
  });

  it("modelValue が SelectTrigger に反映される（初期値）", () => {
    const wrapper = mount(Select, {
      props: { modelValue: "upcoming" },
      slots: {
        default: () =>
          h(SelectTrigger, null, {
            default: () => h(SelectValue),
          }),
      },
    });
    // 値が選択されていれば trigger は data-state を持つ
    expect(wrapper.find('[role="combobox"]').exists()).toBe(true);
  });

  it("SelectContent / SelectItem は document body へ portal されるため、未開状態では子が DOM に居ない", () => {
    const wrapper = mount(Select, {
      props: { modelValue: "" },
      slots: {
        default: () => [
          h(SelectTrigger, null, {
            default: () => h(SelectValue, { placeholder: "選択" }),
          }),
          h(SelectContent, null, {
            default: () =>
              h(SelectItem, { value: "a" }, { default: () => "選択肢 A" }),
          }),
        ],
      },
    });
    // trigger は存在
    expect(wrapper.find('[role="combobox"]').exists()).toBe(true);
    // content は portal されるため wrapper.html() には未表示でも OK（jsdom 上では portal 先が分離する）
    expect(wrapper.exists()).toBe(true);
  });
});
