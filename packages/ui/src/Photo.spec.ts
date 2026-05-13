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

  it("src 指定時に <img> が描画され、placeholder の label は表示されない", () => {
    const wrapper = mount(Photo, {
      props: { src: "/images/hero.jpg", alt: "バレーボール", label: "hero" },
    });
    const img = wrapper.find("img.hq-photo__img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe("/images/hero.jpg");
    expect(img.attributes("alt")).toBe("バレーボール");
    expect(wrapper.find(".hq-photo__label").exists()).toBe(false);
    expect(wrapper.classes()).toContain("hq-photo--has-image");
  });

  it("src 指定時に alt 未指定なら alt='' でフォールバックする", () => {
    const wrapper = mount(Photo, { props: { src: "/images/hero.jpg" } });
    const img = wrapper.find("img.hq-photo__img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("alt")).toBe("");
  });

  it("src 未指定時は <img> を描画せず label を表示する", () => {
    const wrapper = mount(Photo, { props: { label: "hero" } });
    expect(wrapper.find("img.hq-photo__img").exists()).toBe(false);
    expect(wrapper.find(".hq-photo__label").exists()).toBe(true);
    expect(wrapper.classes()).not.toContain("hq-photo--has-image");
  });

  it("tone 指定時に data-tone 属性と hq-photo--toned クラスが付与される", () => {
    const wrapper = mount(Photo, {
      props: { src: "/images/hero.jpg", tone: "hero" },
    });
    expect(wrapper.classes()).toContain("hq-photo--toned");
    expect(wrapper.find("img.hq-photo__img").attributes("data-tone")).toBe("hero");
  });

  it("tone 未指定なら hq-photo--toned クラスも data-tone も付かない（戻せる）", () => {
    const wrapper = mount(Photo, { props: { src: "/images/hero.jpg" } });
    expect(wrapper.classes()).not.toContain("hq-photo--toned");
    expect(wrapper.find("img.hq-photo__img").attributes("data-tone")).toBeUndefined();
  });
});
