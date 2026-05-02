import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import PageBreadcrumb from "./PageBreadcrumb.vue";

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", name: "events", component: { template: "<div />" } },
      {
        path: "/events/:id",
        name: "events-detail",
        component: { template: "<div />" },
      },
    ],
  });
}

describe("PageBreadcrumb — 描画", () => {
  it("末尾以外の to あり項目は router-link でレンダリング", () => {
    const w = mount(PageBreadcrumb, {
      props: {
        items: [
          { label: "Workspace" },
          { label: "Events", to: { name: "events" } },
          { label: "ゆる練 vol.42" },
        ],
      },
      global: { plugins: [makeRouter()] },
    });
    const links = w.findAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]!.text()).toBe("Events");
    expect(links[0]!.attributes("href")).toBe("/events");
  });

  it("末尾項目は to があってもリンクにせず aria-current='page' を付ける", () => {
    const w = mount(PageBreadcrumb, {
      props: {
        items: [
          { label: "Events", to: { name: "events" } },
          { label: "ゆる練 vol.42", to: { name: "events-detail", params: { id: "x" } } },
        ],
      },
      global: { plugins: [makeRouter()] },
    });
    const links = w.findAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]!.text()).toBe("Events");
    const current = w.find('[aria-current="page"]');
    expect(current.exists()).toBe(true);
    expect(current.text()).toBe("ゆる練 vol.42");
  });

  it("to なし項目はリンクにならない (静的セクション)", () => {
    const w = mount(PageBreadcrumb, {
      props: {
        items: [
          { label: "Workspace" },
          { label: "Events" },
        ],
      },
      global: { plugins: [makeRouter()] },
    });
    expect(w.findAll("a")).toHaveLength(0);
  });

  it("nav に aria-label='パンくず' が付く", () => {
    const w = mount(PageBreadcrumb, {
      props: {
        items: [{ label: "Events" }],
      },
      global: { plugins: [makeRouter()] },
    });
    expect(w.find("nav").attributes("aria-label")).toBe("パンくず");
  });

  it("セパレータ '/' は aria-hidden で読み上げない", () => {
    const w = mount(PageBreadcrumb, {
      props: {
        items: [
          { label: "Events", to: { name: "events" } },
          { label: "詳細" },
        ],
      },
      global: { plugins: [makeRouter()] },
    });
    const sep = w.findAll("[aria-hidden='true']");
    // 先頭の "—" + 区切りの "/" の 2 つ以上
    expect(sep.length).toBeGreaterThanOrEqual(2);
  });
});
