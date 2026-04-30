import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import EventsNewPage from "./EventsNewPage.vue";

describe("EventsNewPage", () => {
  it("『準備中』のプレースホルダが見える", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/events", component: { template: "<div />" } },
        { path: "/events/new", component: { template: "<div />" } },
      ],
    });
    await router.push("/events/new");
    await router.isReady();
    const wrapper = mount(EventsNewPage, { global: { plugins: [router] } });
    expect(wrapper.text()).toContain("準備中");
    expect(wrapper.text()).toContain("一覧に戻る");
  });
});
