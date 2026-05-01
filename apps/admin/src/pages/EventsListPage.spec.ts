import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { useEventsListDataMock, useVenuesMock, useAuthSessionMock, signOutMock } =
  vi.hoisted(() => ({
    useEventsListDataMock: vi.fn(),
    useVenuesMock: vi.fn(),
    useAuthSessionMock: vi.fn(),
    signOutMock: vi.fn(),
  }));

vi.mock("@/widgets/events-list/composables/useEventsListData", () => ({
  useEventsListData: useEventsListDataMock,
}));

vi.mock("@/entities/venue", () => ({
  useVenues: useVenuesMock,
  shortenVenueName: (name: string) => name,
}));

vi.mock("@/features/auth", () => ({
  useAuthSession: useAuthSessionMock,
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
  useAuthSessionMock.mockReturnValue({
    signOut: signOutMock,
  });
  signOutMock.mockReset();
  signOutMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", name: "events", component: { template: "<div />" } },
      { path: "/events/new", name: "events-new", component: { template: "<div />" } },
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

  it("ログアウトボタンが見える", async () => {
    const { wrapper } = await renderPage();
    expect(wrapper.text()).toContain("ログアウト");
  });

  it("ログアウトボタン押下で signOut → /login に遷移", async () => {
    const { wrapper, router } = await renderPage();
    const btn = wrapper
      .findAll("button")
      .find((b) => b.text() === "ログアウト");
    await btn!.trigger("click");
    await flushPromises();
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe("login");
  });
});
