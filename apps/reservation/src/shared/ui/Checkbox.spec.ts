import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import Checkbox from "./Checkbox.vue";

describe("Checkbox", () => {
  it("初期 modelValue=false で unchecked、true で checked", () => {
    const w1 = mount(Checkbox, { props: { modelValue: false } });
    expect((w1.element as HTMLInputElement).checked).toBe(false);

    const w2 = mount(Checkbox, { props: { modelValue: true } });
    expect((w2.element as HTMLInputElement).checked).toBe(true);
  });

  it("クリックで update:modelValue を emit する", async () => {
    const w = mount(Checkbox, { props: { modelValue: false } });
    await w.setValue(true);
    expect(w.emitted("update:modelValue")).toEqual([[true]]);
  });

  it("disabled 属性が反映される", () => {
    const w = mount(Checkbox, { props: { disabled: true } });
    expect((w.element as HTMLInputElement).disabled).toBe(true);
  });

  it("required 属性が反映される", () => {
    const w = mount(Checkbox, { props: { required: true } });
    expect((w.element as HTMLInputElement).required).toBe(true);
  });

  it("aria-describedby を反映する", () => {
    const w = mount(Checkbox, { props: { ariaDescribedby: "consent-desc" } });
    expect(w.attributes("aria-describedby")).toBe("consent-desc");
  });

  it("type=checkbox がレンダリングされる", () => {
    const w = mount(Checkbox);
    expect(w.attributes("type")).toBe("checkbox");
  });

  it("id を渡すと <input id=...> が出力される (label と紐付け可能)", () => {
    const w = mount(Checkbox, { props: { id: "my-checkbox" } });
    expect(w.attributes("id")).toBe("my-checkbox");
  });
});
