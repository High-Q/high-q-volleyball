import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FormField from "./FormField.vue";

describe("FormField", () => {
  it("label prop を渡すと <label> が描画される", () => {
    const wrapper = mount(FormField, { props: { label: "メールアドレス" } });
    expect(wrapper.find("label").exists()).toBe(true);
    expect(wrapper.find("label").text()).toBe("メールアドレス");
  });

  it("label を渡さない場合 <label> が描画されない", () => {
    const wrapper = mount(FormField);
    expect(wrapper.find("label").exists()).toBe(false);
  });

  it("error prop が渡されると role=\"alert\" の段落で表示される", () => {
    const wrapper = mount(FormField, {
      props: { error: "このメールアドレスは無効です" },
    });
    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toBe("このメールアドレスは無効です");
  });

  it("error が無いとき hint が表示される", () => {
    const wrapper = mount(FormField, {
      props: { hint: "登録済みのアドレスを入力してください" },
    });
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("登録済みのアドレスを入力してください");
  });

  it("error と hint を同時に渡すと error が優先表示される", () => {
    const wrapper = mount(FormField, {
      props: { error: "Error!", hint: "Hint" },
    });
    expect(wrapper.text()).toContain("Error!");
    expect(wrapper.text()).not.toContain("Hint");
  });

  it("htmlFor を渡すとスロット props の fieldId として伝搬する", () => {
    const wrapper = mount(FormField, {
      props: { label: "Email", htmlFor: "fixed-id" },
    });
    expect(wrapper.find("label").attributes("for")).toBe("fixed-id");
  });
});
