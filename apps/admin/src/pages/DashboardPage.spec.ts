import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { signOutMock } = vi.hoisted(() => ({
  signOutMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({ signOut: signOutMock }),
}));

vi.mock("@/features/identity-document-pending-badge", () => ({
  usePendingCount: () => ({ count: ref(0) }),
  PendingCountBadge: { template: "<span />" },
}));

// 4 widget は stub 化し、Page のレイアウト / header 動線のみ検証する
vi.mock("@/widgets/dashboard-stat-cards", () => ({
  DashboardStatCards: { template: "<div data-test='w-stat-cards' />" },
}));
vi.mock("@/widgets/dashboard-upcoming-events", () => ({
  DashboardUpcomingEvents: { template: "<div data-test='w-upcoming' />" },
}));
vi.mock("@/widgets/dashboard-notifications", () => ({
  DashboardNotifications: { template: "<div data-test='w-notifications' />" },
}));
vi.mock("@/widgets/dashboard-recent-bookings", () => ({
  DashboardRecentBookings: { template: "<div data-test='w-recent-bookings' />" },
}));

import DashboardPage from "./DashboardPage.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", name: "dashboard", component: DashboardPage },
    { path: "/events", name: "events", component: { template: "<div />" } },
    { path: "/events/new", name: "events-new", component: { template: "<div />" } },
    { path: "/members", name: "members", component: { template: "<div />" } },
    {
      path: "/identity-documents",
      name: "identity-documents",
      component: { template: "<div />" },
    },
    { path: "/login", name: "login", component: { template: "<div />" } },
  ],
});

async function mountPage() {
  router.push("/");
  await router.isReady();
  const w = mount(DashboardPage, { global: { plugins: [router] } });
  await flushPromises();
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardPage", () => {
  it("4 widget をマウントする", async () => {
    const w = await mountPage();
    expect(w.find("[data-test='w-stat-cards']").exists()).toBe(true);
    expect(w.find("[data-test='w-upcoming']").exists()).toBe(true);
    expect(w.find("[data-test='w-notifications']").exists()).toBe(true);
    expect(w.find("[data-test='w-recent-bookings']").exists()).toBe(true);
  });

  it("横遷移リンク (会員 / 本人確認書類) を持つ", async () => {
    const w = await mountPage();
    expect(w.find('a[href="/members"]').exists()).toBe(true);
    expect(w.find('a[href="/identity-documents"]').exists()).toBe(true);
  });

  it("主 CTA は /events/new へ", async () => {
    const w = await mountPage();
    expect(w.find('a[href="/events/new"]').exists()).toBe(true);
  });

  it("ログアウトで signOut + /login へ replace", async () => {
    const replaceSpyLocal = vi.spyOn(router, "replace");
    const w = await mountPage();
    const logoutBtn = w
      .findAll("button")
      .find((b) => b.text().includes("ログアウト"));
    expect(logoutBtn).toBeDefined();
    await logoutBtn!.trigger("click");
    await flushPromises();
    expect(signOutMock).toHaveBeenCalledOnce();
    expect(replaceSpyLocal).toHaveBeenCalledWith({ name: "login" });
  });
});
