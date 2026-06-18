import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DataCardList from "./DataCardList.vue";

/**
 * DataCardList は「デスクトップ Table / モバイル カード」併置のうち、モバイル側の
 * カード縦積み枠を担う。レスポンシブ切替自体は Tailwind の `md:hidden` に委譲するため、
 * テストは「< md でのみ表示される class 契約」「リスト a11y セマンティクス」を検証する。
 *
 * 関連: openspec/changes/admin-mobile-responsive/specs/admin-responsive-shell/spec.md
 */
describe("DataCardList", () => {
  it("role=list を持つ <ul> を返す", () => {
    const wrapper = mount(DataCardList);
    const ul = wrapper.find("ul");
    expect(ul.exists()).toBe(true);
    expect(ul.attributes("role")).toBe("list");
  });

  it("モバイル限定 (md:hidden) class を持つ", () => {
    const wrapper = mount(DataCardList);
    expect(wrapper.find("ul").classes()).toContain("md:hidden");
  });

  it("縦積みの flex-col class を持つ", () => {
    const wrapper = mount(DataCardList);
    expect(wrapper.find("ul").classes()).toContain("flex-col");
  });

  it("スロット内容が描画される", () => {
    const wrapper = mount(DataCardList, {
      slots: { default: "<li>カード</li>" },
    });
    expect(wrapper.find("li").exists()).toBe(true);
    expect(wrapper.text()).toContain("カード");
  });

  it("class prop が追加される", () => {
    const wrapper = mount(DataCardList, { props: { class: "gap-hq-2" } });
    expect(wrapper.find("ul").classes()).toContain("gap-hq-2");
  });
});
