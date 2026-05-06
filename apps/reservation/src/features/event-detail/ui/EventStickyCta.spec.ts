import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import EventStickyCta from "./EventStickyCta.vue";

describe("EventStickyCta", () => {
  it("「予約に進む」押下で proceed イベントが emit される", async () => {
    const wrapper = mount(EventStickyCta, { props: { fee: 1000 } });
    const cta = wrapper
      .findAll("button")
      .find((b) => b.text().includes("予約に進む"));
    expect(cta).toBeDefined();
    await cta?.trigger("click");
    expect(wrapper.emitted("proceed")).toHaveLength(1);
  });

  it("「準備中」案内文言は表示されない", () => {
    const wrapper = mount(EventStickyCta, { props: { fee: 1000 } });
    expect(wrapper.text()).not.toContain("準備中");
  });

  it("参加費を表示する", () => {
    const wrapper = mount(EventStickyCta, { props: { fee: 1500 } });
    expect(wrapper.text()).toContain("1,500 円");
  });
});
