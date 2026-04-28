import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Photo from "./Photo.vue";

describe("Photo", () => {
  it("デフォルトで height=200 / width=100% が適用される", () => {
    const wrapper = mount(Photo);
    const style = wrapper.attributes("style") ?? "";
    expect(style).toContain("height: 200px");
    expect(style).toContain("width: 100%");
  });

  it("h / w / radius を props で上書きできる", () => {
    const wrapper = mount(Photo, {
      props: { h: 240, w: "320px", radius: 12 },
    });
    const style = wrapper.attributes("style") ?? "";
    expect(style).toContain("height: 240px");
    expect(style).toContain("width: 320px");
    expect(style).toContain("border-radius: 12px");
  });

  it("label が指定された時のみラベル要素が描画される", () => {
    const without = mount(Photo);
    expect(without.find(".hq-photo__label").exists()).toBe(false);

    const withLabel = mount(Photo, { props: { label: "EVENT_001" } });
    expect(withLabel.find(".hq-photo__label").exists()).toBe(true);
    expect(withLabel.find(".hq-photo__label").text()).toBe("[ EVENT_001 ]");
  });

  it("w に文字列（例: '50%'）を渡すとそのまま反映される", () => {
    const wrapper = mount(Photo, { props: { w: "50%" } });
    expect(wrapper.attributes("style") ?? "").toContain("width: 50%");
  });
});
