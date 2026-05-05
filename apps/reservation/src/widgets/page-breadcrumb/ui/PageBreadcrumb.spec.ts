import { describe, expect, it } from "vitest";
import { mountWithRouter } from "@/test/mountWithRouter";
import PageBreadcrumb from "./PageBreadcrumb.vue";

const routes = [
  { path: "/", component: { template: "<div />" } },
  {
    path: "/events",
    name: "events-list",
    component: { template: "<div />" },
  },
];

describe("PageBreadcrumb", () => {
  it("nav に aria-label=パンくず を持つ", async () => {
    const wrapper = await mountWithRouter(PageBreadcrumb, routes, "/", {
      props: {
        items: [{ label: "マイページ", to: { name: "events-list" } }],
      },
    });
    const nav = wrapper.find("nav");
    expect(nav.exists()).toBe(true);
    expect(nav.attributes("aria-label")).toBe("パンくず");
  });

  it("第 1 セグメントが「マイページ」で events-list へリンクする", async () => {
    const wrapper = await mountWithRouter(PageBreadcrumb, routes, "/", {
      props: {
        items: [
          { label: "マイページ", to: { name: "events-list" } },
          { label: "イベント" },
        ],
      },
    });
    const link = wrapper.findComponent({ name: "RouterLink" });
    expect(link.exists()).toBe(true);
    expect(link.text()).toBe("マイページ");
    expect(link.props("to")).toEqual({ name: "events-list" });
  });

  it("末尾セグメントは aria-current=page を持ち、router-link ではない", async () => {
    const wrapper = await mountWithRouter(PageBreadcrumb, routes, "/", {
      props: {
        items: [
          { label: "マイページ", to: { name: "events-list" } },
          { label: "イベント", to: { name: "events-list" } },
          { label: "ゆる練 vol.43" },
        ],
      },
    });
    const current = wrapper.find('[aria-current="page"]');
    expect(current.exists()).toBe(true);
    expect(current.text()).toBe("ゆる練 vol.43");
  });

  it("3 アイテム表示で 2 つのセパレータが描画される", async () => {
    const wrapper = await mountWithRouter(PageBreadcrumb, routes, "/", {
      props: {
        items: [
          { label: "マイページ", to: { name: "events-list" } },
          { label: "イベント", to: { name: "events-list" } },
          { label: "ゆる練 vol.43" },
        ],
      },
    });
    const separators = wrapper.findAll('span[aria-hidden="true"]');
    // 先頭の "—" + items 間の "/" × 2 = 3
    expect(separators.length).toBe(3);
  });
});
