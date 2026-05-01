import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { useEventsListDataMock, useVenuesMock, refetchMock } = vi.hoisted(() => ({
  useEventsListDataMock: vi.fn(),
  useVenuesMock: vi.fn(),
  refetchMock: vi.fn(),
}));

vi.mock("../composables/useEventsListData", () => ({
  useEventsListData: useEventsListDataMock,
}));

vi.mock("@/entities/venue", () => ({
  useVenues: useVenuesMock,
  // EventsTable が会場名短縮で参照する。テストでは pass-through で十分。
  shortenVenueName: (name: string) => name,
}));

import EventsListWidget from "./EventsListWidget.vue";
import type { EventListRow, FetchErrorCode } from "@/entities/event";

const baseRow = (i: number): EventListRow => ({
  id: `${i.toString().padStart(8, "0")}-1111-4111-8111-111111111111` as EventListRow["id"],
  name: `イベント ${i}`,
  description: null,
  start_at: "2026-05-12T19:00:00+09:00",
  end_at: "2026-05-12T21:00:00+09:00",
  venue_id: "22222222-2222-4222-8222-222222222222" as EventListRow["venue_id"],
  venue_name: "亀戸スポーツセンター",
  fee: 1000,
  capacity: 24,
  visibility: "published",
  status: "scheduled",
  cancel_deadline: null,
  reserved_count: 6,
  created_at: "2026-04-01T00:00:00+09:00",
  updated_at: "2026-04-01T00:00:00+09:00",
});

function setupListMock(state: {
  data?: EventListRow[];
  total?: number;
  isPending?: boolean;
  isError?: boolean;
  errorCode?: FetchErrorCode | null;
}) {
  useEventsListDataMock.mockReturnValue({
    data: ref(state.data ?? []),
    total: ref(state.total ?? 0),
    isPending: ref(state.isPending ?? false),
    isError: ref(state.isError ?? false),
    errorCode: ref(state.errorCode ?? null),
    refetch: refetchMock,
  });
}

async function renderWidget(query = "") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
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
      {
        path: "/events/:id",
        name: "events-detail",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push(`/events${query ? `?${query}` : ""}`);
  await router.isReady();

  const wrapper = mount(EventsListWidget, {
    global: { plugins: [router] },
  });
  await flushPromises();
  return { wrapper, router };
}

beforeEach(() => {
  useEventsListDataMock.mockReset();
  useVenuesMock.mockReset();
  refetchMock.mockReset();
  useVenuesMock.mockReturnValue({
    venues: ref([]),
    reload: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("EventsListWidget — 4 状態", () => {
  it("Loading 状態（isPending=true, data=[]）で Skeleton が描画される", async () => {
    setupListMock({ isPending: true, data: [] });
    const { wrapper } = await renderWidget();
    expect(wrapper.findAll('[data-testid="skeleton-row"]')).toHaveLength(6);
  });

  it("Empty (一覧自体空) 状態で 'イベントがまだありません' + 新規作成 CTA", async () => {
    setupListMock({ data: [] });
    const { wrapper } = await renderWidget();
    expect(wrapper.text()).toContain("イベントがまだありません");
  });

  it("Empty (フィルタ後 0 件) 状態で '該当するイベントがありません' + リセット CTA", async () => {
    setupListMock({ data: [] });
    // フィルタ済みなので isFiltered = true になる URL クエリ
    const { wrapper } = await renderWidget("q=foo");
    expect(wrapper.text()).toContain("該当するイベントがありません");
  });

  it("Error 状態で role='alert' + エラーコード表示", async () => {
    setupListMock({ isError: true, errorCode: "SERVER_ERROR" });
    const { wrapper } = await renderWidget();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("SERVER_ERROR");
  });

  it("Error の retry ボタン押下で refetch が呼ばれる", async () => {
    setupListMock({ isError: true, errorCode: "SERVER_ERROR" });
    const { wrapper } = await renderWidget();
    await wrapper.find('[role="alert"] button').trigger("click");
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it("Success 状態で Table + Pagination が描画される", async () => {
    setupListMock({
      data: [baseRow(1), baseRow(2)],
      total: 50,
    });
    const { wrapper } = await renderWidget();
    expect(wrapper.findAll("tbody tr").length).toBe(2);
    expect(wrapper.text()).toContain("50 件");
  });

  it("Toolbar の新規作成 CTA で /events/new に遷移する", async () => {
    setupListMock({ data: [baseRow(1)], total: 1 });
    const { wrapper, router } = await renderWidget();
    const newBtn = wrapper
      .findAll("button")
      .find((b) => b.text().includes("新規作成"));
    await newBtn!.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("events-new");
  });
});
