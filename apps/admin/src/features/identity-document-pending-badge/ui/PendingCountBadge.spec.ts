import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PendingCountBadge from "./PendingCountBadge.vue";

describe("PendingCountBadge", () => {
  it("count=0 のとき何も描画されない (Badge 非表示)", () => {
    const wrapper = mount(PendingCountBadge, { props: { count: 0 } });
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
    expect(wrapper.text()).toBe("");
  });

  it("count=3 のとき '3' を含む Badge が描画される", () => {
    const wrapper = mount(PendingCountBadge, { props: { count: 3 } });
    const badge = wrapper.find('[role="status"]');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe("3");
  });

  it("aria-label='未対応の書類 N 件' が付与される", () => {
    const wrapper = mount(PendingCountBadge, { props: { count: 5 } });
    const badge = wrapper.find('[role="status"]');
    expect(badge.attributes("aria-label")).toBe("未対応の書類 5 件");
  });

  it("赤系背景クラス (bg-danger) と paper 文字色が付与される (HQ token)", () => {
    const wrapper = mount(PendingCountBadge, { props: { count: 1 } });
    const badge = wrapper.find('[role="status"]');
    expect(badge.classes()).toContain("bg-danger");
    expect(badge.classes()).toContain("text-paper");
  });

  it("count=10 (2 桁) も正しく描画される", () => {
    const wrapper = mount(PendingCountBadge, { props: { count: 10 } });
    expect(wrapper.find('[role="status"]').text()).toBe("10");
  });
});
