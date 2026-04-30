import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EventsTableSkeleton from "./EventsTableSkeleton.vue";

describe("EventsTableSkeleton", () => {
  it("Skeleton 行を 6 行表示する", () => {
    const wrapper = mount(EventsTableSkeleton);
    expect(wrapper.findAll('[data-testid="skeleton-row"]')).toHaveLength(6);
  });

  it("Table のヘッダーが表示されている（Loading 中もカラム見出しが見える）", () => {
    const wrapper = mount(EventsTableSkeleton);
    expect(wrapper.text()).toContain("日付");
    expect(wrapper.text()).toContain("タイトル");
    expect(wrapper.text()).toContain("会場");
    expect(wrapper.text()).toContain("ステータス");
  });
});
