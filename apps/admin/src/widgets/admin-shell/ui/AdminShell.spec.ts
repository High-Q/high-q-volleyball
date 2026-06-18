import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

// SidebarNavContent は独自に依存 (auth / pending) を持つため stub 化し、
// AdminShell のレイアウト構造とドロワー開閉のみを検証する。
vi.mock("./SidebarNavContent.vue", () => ({
  default: {
    name: "SidebarNavContent",
    emits: ["navigate"],
    template: "<div data-test='sidebar-nav'>NAV</div>",
  },
}));

import AdminShell from "./AdminShell.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    {
      path: "/",
      name: "dashboard",
      component: { template: "<div />" },
      meta: { title: "ダッシュボード" },
    },
  ],
});

async function mountShell() {
  router.push("/");
  await router.isReady();
  const w = mount(AdminShell, {
    global: { plugins: [router] },
    slots: { default: "<p data-test='page-content'>本文</p>" },
  });
  await flushPromises();
  return w;
}

afterEach(() => {
  // ポータルで body に挿入された残骸を掃除
  document.body.querySelectorAll("[role='dialog']").forEach((n) => n.remove());
});

describe("AdminShell", () => {
  it("デスクトップ aside にサイドバーナビを描画する", async () => {
    const w = await mountShell();
    const aside = w.find("aside");
    expect(aside.exists()).toBe(true);
    expect(aside.find("[data-test='sidebar-nav']").exists()).toBe(true);
    expect(aside.classes()).toContain("md:flex");
  });

  it("モバイル AppBar に route.meta.title を表示する", async () => {
    const w = await mountShell();
    const header = w.find("header");
    expect(header.classes()).toContain("md:hidden");
    expect(header.text()).toContain("ダッシュボード");
  });

  it("主要アクションの Teleport ターゲットを持つ", async () => {
    const w = await mountShell();
    expect(w.find("#admin-appbar-action").exists()).toBe(true);
  });

  it("ページ本文をスロットで描画する", async () => {
    const w = await mountShell();
    expect(w.find("[data-test='page-content']").exists()).toBe(true);
  });

  it("ハンバーガーでドロワーが開く (aria-expanded が true になり閉じるボタンが出る)", async () => {
    const w = await mountShell();
    const trigger = w.get("[aria-label='メニューを開く']");
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(document.body.querySelector("[aria-label='閉じる']")).toBeNull();

    await trigger.trigger("click");
    await flushPromises();

    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(document.body.querySelector("[aria-label='閉じる']")).not.toBeNull();
  });
});
