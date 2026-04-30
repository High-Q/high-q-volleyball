import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EventsEmptyState from "./EventsEmptyState.vue";

describe("EventsEmptyState", () => {
  it("isFiltered=false で『イベントがまだありません』+ 新規作成 CTA", () => {
    const wrapper = mount(EventsEmptyState, {
      props: { isFiltered: false },
    });
    expect(wrapper.text()).toContain("イベントがまだありません");
    expect(wrapper.text()).toContain("新規作成");
    expect(wrapper.text()).not.toContain("フィルタをリセット");
  });

  it("isFiltered=true で『該当するイベントがありません』+ リセット CTA", () => {
    const wrapper = mount(EventsEmptyState, {
      props: { isFiltered: true },
    });
    expect(wrapper.text()).toContain("該当するイベントがありません");
    expect(wrapper.text()).toContain("フィルタをリセット");
    expect(wrapper.text()).not.toContain("最初のイベント");
  });

  it("新規作成ボタン押下で clickNew emit", async () => {
    const wrapper = mount(EventsEmptyState, {
      props: { isFiltered: false },
    });
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("clickNew")).toBeDefined();
  });

  it("リセットボタン押下で clickReset emit", async () => {
    const wrapper = mount(EventsEmptyState, {
      props: { isFiltered: true },
    });
    await wrapper.find("button").trigger("click");
    expect(wrapper.emitted("clickReset")).toBeDefined();
  });
});
