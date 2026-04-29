import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Input from "./Input.vue";

describe("Input", () => {
  it("基本レンダリングで <input> 要素を返す", () => {
    const wrapper = mount(Input);
    expect(wrapper.find("input").exists()).toBe(true);
  });

  it("type prop が input 属性に反映される（default は text）", () => {
    const defaultWrapper = mount(Input);
    expect(defaultWrapper.find("input").attributes("type")).toBe("text");

    const emailWrapper = mount(Input, { props: { type: "email" } });
    expect(emailWrapper.find("input").attributes("type")).toBe("email");
  });

  it("placeholder / disabled / id / name が input 属性に反映される", () => {
    const wrapper = mount(Input, {
      props: {
        placeholder: "メールアドレス",
        disabled: true,
        id: "email-field",
        name: "email",
      },
    });
    const el = wrapper.find("input");
    expect(el.attributes("placeholder")).toBe("メールアドレス");
    expect(el.attributes("disabled")).toBeDefined();
    expect(el.attributes("id")).toBe("email-field");
    expect(el.attributes("name")).toBe("email");
  });

  it("v-model 相当の update:modelValue を発火する", async () => {
    const wrapper = mount(Input, { props: { modelValue: "" } });
    await wrapper.find("input").setValue("hello");
    const events = wrapper.emitted("update:modelValue");
    expect(events).toBeDefined();
    expect(events?.[0]).toEqual(["hello"]);
  });

  it("ariaInvalid が true の場合 aria-invalid 属性が付与される", () => {
    const wrapper = mount(Input, { props: { ariaInvalid: true } });
    expect(wrapper.find("input").attributes("aria-invalid")).toBe("true");
  });
});
