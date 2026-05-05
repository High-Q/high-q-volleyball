import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Textarea from "./Textarea.vue";

describe("Textarea — HQ グローバル入力規約", () => {
  it("初期状態: aria-invalid 未指定 (or false) で hairline border (赤枠ではない)", () => {
    const wrapper = mount(Textarea, { props: { modelValue: "" } });
    const ta = wrapper.find("textarea");
    // Vue の attribute binding により未指定の boolean は undefined or 'false' になる
    const aria = ta.attributes("aria-invalid");
    expect(aria === undefined || aria === "false").toBe(true);
    expect(ta.classes().join(" ")).toContain("border-hairline");
  });

  it("aria-invalid=false で hairline border (赤枠ではない)", () => {
    const wrapper = mount(Textarea, {
      props: { modelValue: "", ariaInvalid: false },
    });
    expect(wrapper.find("textarea").attributes("aria-invalid")).toBe("false");
  });

  it("aria-invalid=true で aria 属性が反映される (CSS で border-danger 起動)", () => {
    const wrapper = mount(Textarea, {
      props: { modelValue: "", ariaInvalid: true },
    });
    const ta = wrapper.find("textarea");
    expect(ta.attributes("aria-invalid")).toBe("true");
    // Tailwind の aria-[invalid=true]:border-danger が適用される
    expect(ta.classes().join(" ")).toContain("aria-[invalid=true]:border-danger");
  });

  it("v-model で値が双方向にバインドされる", async () => {
    const wrapper = mount(Textarea, { props: { modelValue: "abc" } });
    const ta = wrapper.find("textarea");
    expect((ta.element as HTMLTextAreaElement).value).toBe("abc");
    await ta.setValue("xyz");
    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual(["xyz"]);
  });

  it("rows のデフォルトは 4", () => {
    const wrapper = mount(Textarea, { props: { modelValue: "" } });
    expect(wrapper.find("textarea").attributes("rows")).toBe("4");
  });

  it("rows を上書きできる", () => {
    const wrapper = mount(Textarea, { props: { modelValue: "", rows: 6 } });
    expect(wrapper.find("textarea").attributes("rows")).toBe("6");
  });

  it("maxlength を渡せる", () => {
    const wrapper = mount(Textarea, {
      props: { modelValue: "", maxlength: 500 },
    });
    expect(wrapper.find("textarea").attributes("maxlength")).toBe("500");
  });

  it("disabled で disabled 属性が付く", () => {
    const wrapper = mount(Textarea, {
      props: { modelValue: "", disabled: true },
    });
    expect(wrapper.find("textarea").attributes("disabled")).toBeDefined();
  });

  it("aria-describedby を渡せる (FormField のメッセージと関連付け)", () => {
    const wrapper = mount(Textarea, {
      props: { modelValue: "", ariaDescribedby: "field-1-message" },
    });
    expect(wrapper.find("textarea").attributes("aria-describedby")).toBe(
      "field-1-message",
    );
  });
});
