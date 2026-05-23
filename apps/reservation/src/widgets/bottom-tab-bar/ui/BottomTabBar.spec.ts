import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";
import {
  createMemoryHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import BottomTabBar from "./BottomTabBar.vue";

vi.mock("@/shared/lib/useBottomTabBarVisible", () => ({
  useBottomTabBarVisible: () => ({ value: true }),
}));

// #296: BottomTabBar が useAuthSession を参照するためダミー Session を mock
vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    member: ref<{ correctionRequests: never[] } | null>(null),
  }),
}));

const routes: RouteRecordRaw[] = [
  { path: "/events", name: "events-list", component: { template: "<div/>" } },
  { path: "/events/:id", name: "event-detail", component: { template: "<div/>" } },
  { path: "/history", name: "history", component: { template: "<div/>" } },
  { path: "/profile", name: "profile", component: { template: "<div/>" } },
];

async function mountAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(path);
  await router.isReady();
  return mount(BottomTabBar, { global: { plugins: [router] } });
}

function activeTabKey(wrapper: ReturnType<typeof mount>): string | null {
  const active = wrapper
    .findAll("a")
    .find((a) => a.attributes("aria-current") === "page");
  return active?.attributes("data-tab") ?? null;
}

describe("BottomTabBar — active state per path", () => {
  it("/events 配下ではホームのみ active", async () => {
    const wrapper = await mountAt("/events");
    expect(activeTabKey(wrapper)).toBe("home");
  });

  it("/events/:id 配下でもホームのみ active (startsWith マッチ)", async () => {
    const wrapper = await mountAt(
      "/events/11111111-1111-1111-1111-111111111111",
    );
    expect(activeTabKey(wrapper)).toBe("home");
  });

  it("/history 配下では履歴のみ active", async () => {
    const wrapper = await mountAt("/history");
    expect(activeTabKey(wrapper)).toBe("history");
  });

  it("/profile 配下ではプロフィールのみ active (履歴は点灯しない)", async () => {
    const wrapper = await mountAt("/profile");
    expect(activeTabKey(wrapper)).toBe("profile");
  });
});

describe("BottomTabBar — tab links", () => {
  it("履歴タブのリンクは /history を指す", async () => {
    const wrapper = await mountAt("/events");
    const historyTab = wrapper
      .findAll("a")
      .find((a) => a.attributes("data-tab") === "history");
    expect(historyTab?.attributes("href")).toBe("/history");
  });
});
