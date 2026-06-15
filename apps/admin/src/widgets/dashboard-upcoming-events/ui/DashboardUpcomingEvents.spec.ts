import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { ok, err } from "@high-q/shared";
import type { DashboardUpcomingEventRow } from "@/entities/dashboard";

const { getUpcomingMock } = vi.hoisted(() => ({
  getUpcomingMock: vi.fn(),
}));

vi.mock("@/entities/dashboard", () => ({
  getDashboardUpcomingEvents: getUpcomingMock,
}));

vi.mock("@/entities/venue", () => ({
  shortenVenueName: (name: string) => name,
}));

import DashboardUpcomingEvents from "./DashboardUpcomingEvents.vue";

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/", name: "dashboard", component: { template: "<div />" } },
    { path: "/events", name: "events", component: { template: "<div />" } },
    { path: "/events/new", name: "events-new", component: { template: "<div />" } },
    {
      path: "/events/:id",
      name: "events-detail",
      component: { template: "<div />" },
    },
  ],
});

function row(i: number, overrides: Partial<DashboardUpcomingEventRow> = {}): DashboardUpcomingEventRow {
  return {
    id: `${i}0000000-0000-4000-8000-000000000000` as DashboardUpcomingEventRow["id"],
    name: `ゆる練 vol.${i}`,
    start_at: "2026-06-20T19:30:00+09:00",
    end_at: "2026-06-20T21:30:00+09:00",
    venue_name: "亀戸スポーツセンター",
    capacity: 18,
    reserved_count: 16,
    ...overrides,
  };
}

async function mountWidget() {
  const w = mount(DashboardUpcomingEvents, {
    global: { plugins: [router] },
  });
  await flushPromises();
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardUpcomingEvents", () => {
  it("Loading: skeleton 表示", async () => {
    let resolve!: (v: unknown) => void;
    getUpcomingMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const w = mount(DashboardUpcomingEvents, { global: { plugins: [router] } });
    await nextTick();
    expect(w.find('[aria-busy="true"]').exists()).toBe(true);
    resolve(ok([]));
    await flushPromises();
  });

  it("Success: 3 件 + 行リンクが /events/:id を指す", async () => {
    getUpcomingMock.mockResolvedValue(ok([row(1), row(2), row(3)]));
    const w = await mountWidget();
    const links = w.findAll('a[href^="/events/"]');
    expect(links.length).toBe(3);
    expect(links[0]!.attributes("href")).toBe(
      "/events/10000000-0000-4000-8000-000000000000",
    );
  });

  it("capacity NULL は N 件テキストにフォールバック", async () => {
    getUpcomingMock.mockResolvedValue(
      ok([row(1, { capacity: null, reserved_count: 5 })]),
    );
    const w = await mountWidget();
    expect(w.text()).toContain("5 件");
    expect(w.findComponent({ name: "RemainBar" }).exists()).toBe(false);
  });

  it("Empty: メッセージ + 新しいイベント CTA", async () => {
    getUpcomingMock.mockResolvedValue(ok([]));
    const w = await mountWidget();
    expect(w.text()).toContain("予定されたイベントはありません");
    expect(w.find('a[href="/events/new"]').exists()).toBe(true);
  });

  it("「全件を見る」は /events へ", async () => {
    getUpcomingMock.mockResolvedValue(ok([row(1)]));
    const w = await mountWidget();
    expect(w.find('a[href="/events"]').exists()).toBe(true);
  });

  it("Error: role=alert + 再試行で refetch", async () => {
    getUpcomingMock.mockResolvedValue(
      err({ code: "SERVER_ERROR", message: "boom" }),
    );
    const w = await mountWidget();
    expect(w.find('[role="alert"]').exists()).toBe(true);
    getUpcomingMock.mockResolvedValue(ok([row(1)]));
    await w.find("button").trigger("click");
    await flushPromises();
    expect(getUpcomingMock).toHaveBeenCalledTimes(2);
  });
});
