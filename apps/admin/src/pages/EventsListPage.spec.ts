import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { useEventsListDataMock, useVenuesMock } = vi.hoisted(() => ({
  useEventsListDataMock: vi.fn(),
  useVenuesMock: vi.fn(),
}));

vi.mock("@/widgets/events-list/composables/useEventsListData", () => ({
  useEventsListData: useEventsListDataMock,
}));

vi.mock("@/entities/venue", () => ({
  useVenues: useVenuesMock,
  shortenVenueName: (name: string) => name,
}));

import EventsListPage from "./EventsListPage.vue";

beforeEach(() => {
  useEventsListDataMock.mockReturnValue({
    data: ref([]),
    total: ref(0),
    isPending: ref(false),
    isError: ref(false),
    errorCode: ref(null),
    refetch: vi.fn(),
  });
  useVenuesMock.mockReturnValue({
    venues: ref([]),
    reload: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "dashboard", component: { template: "<div />" } },
      { path: "/events", name: "events", component: { template: "<div />" } },
      {
        path: "/events/new",
        name: "events-new",
        component: { template: "<div />" },
      },
      {
        path: "/events/:id/edit",
        name: "edit",
        component: { template: "<div />" },
      },
      { path: "/login", name: "login", component: { template: "<div />" } },
    ],
  });
  await router.push("/events");
  await router.isReady();
  const wrapper = mount(EventsListPage, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

describe("EventsListPage", () => {
  it("ページタイトル「イベント」が見える", async () => {
    const { wrapper } = await renderPage();
    expect(wrapper.text()).toContain("イベント");
  });

  // #155 グローバルナビ (会員 / 本人確認書類 / 会場 / ログアウト) は共通シェル
  // (admin-shell) へ移設したため、Page header からは撤去された。
  it("グローバルナビ / ログアウトを header に持たない", async () => {
    const { wrapper } = await renderPage();
    expect(wrapper.find('[aria-label="会員の一覧"]').exists()).toBe(false);
    expect(wrapper.find('a[href="/identity-documents"]').exists()).toBe(false);
    const logout = wrapper
      .findAll("button")
      .find((b) => b.text() === "ログアウト");
    expect(logout).toBeUndefined();
  });
});
