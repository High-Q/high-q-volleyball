import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import type { EventId } from "@high-q/shared";

const { getEventDetailMock, getEventParticipantsMock } = vi.hoisted(() => ({
  getEventDetailMock: vi.fn(),
  getEventParticipantsMock: vi.fn(),
}));

vi.mock("@/entities/event-detail", () => ({
  getEventDetail: getEventDetailMock,
}));

vi.mock("@/entities/reservation", async () => {
  const actual = await vi.importActual<
    typeof import("@/entities/reservation")
  >("@/entities/reservation");
  return {
    ...actual,
    getEventParticipants: getEventParticipantsMock,
  };
});

import EventDetailWidget from "./EventDetailWidget.vue";

const EVENT_ID = "00000000-0000-0000-0000-000000000001" as unknown as EventId;

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", name: "events", component: { template: "<div />" } },
      {
        path: "/events/:id/edit",
        name: "events-edit",
        component: { template: "<div />" },
      },
      {
        path: "/events/:id",
        name: "events-detail",
        component: EventDetailWidget,
      },
    ],
  });
}

let wrapper: VueWrapper | null = null;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("EventDetailWidget — Loading", () => {
  it("初期マウント時は Skeleton を表示", () => {
    // resolve しない promise → 永遠に pending
    getEventDetailMock.mockReturnValue(new Promise(() => {}));
    getEventParticipantsMock.mockReturnValue(new Promise(() => {}));
    const router = buildRouter();
    wrapper = mount(EventDetailWidget, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
    });
    expect(
      wrapper.find("[data-testid='event-detail-skeleton']").exists(),
    ).toBe(true);
  });
});

describe("EventDetailWidget — Error", () => {
  it("EVENT_NOT_FOUND で「一覧へ戻る」CTA が表示される", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: false,
      error: { code: "EVENT_NOT_FOUND", message: "" },
    });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    await router.push("/events/test");
    wrapper = mount(EventDetailWidget, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
    });
    await flushPromises();

    const errorEl = wrapper.find("[data-testid='event-detail-error']");
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toContain("削除済み");
    expect(errorEl.text()).toContain("一覧へ戻る");
  });

  it("NETWORK_ERROR で「再試行」CTA が表示される", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "" },
    });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    await router.push("/events/test");
    wrapper = mount(EventDetailWidget, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
    });
    await flushPromises();

    const errorEl = wrapper.find("[data-testid='event-detail-error']");
    expect(errorEl.text()).toContain("再試行");
  });
});

describe("EventDetailWidget — Success", () => {
  const fullDetail = {
    id: EVENT_ID,
    name: "ゆる練 vol.42",
    description: null,
    start_at: "2026-04-28T10:30:00Z",
    end_at: "2026-04-28T12:30:00Z",
    venue_id: "v" as unknown,
    venue_name: "亀戸スポーツセンター",
    fee: 1000,
    capacity: null,
    visibility: "published" as const,
    status: "scheduled" as const,
    cancel_deadline: null,
    reserved_count: 16,
    checked_in_count: 4,
    first_time_count: 2,
    waitlist_count: 0,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  };

  it("event_detail 取得成功で TopBar・StatCards・Tabs が描画される", async () => {
    getEventDetailMock.mockResolvedValue({ ok: true, value: fullDetail });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    await router.push("/events/test");
    wrapper = mount(EventDetailWidget, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
    });
    await flushPromises();

    // TopBar: event 名
    expect(wrapper.text()).toContain("ゆる練 vol.42");
    // StatCard 1 番目: capacity NULL なので「予約数」
    expect(wrapper.text()).toContain("予約数");
    // Tabs
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(3);
  });

  it("capacity ありなら RemainBar が描画される", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: true,
      value: { ...fullDetail, capacity: 18 },
    });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    await router.push("/events/test");
    wrapper = mount(EventDetailWidget, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("残席");
    // RemainBar は @high-q/ui からマウント。具体 selector が無くても StatCards に「残席」が出ていれば視覚的に証明
  });

  it("capacity NULL では RemainBar が描画されない", async () => {
    getEventDetailMock.mockResolvedValue({ ok: true, value: fullDetail });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    await router.push("/events/test");
    wrapper = mount(EventDetailWidget, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
    });
    await flushPromises();

    // 「残席」文字列がない（StatCard 1 番目は「予約数」表示）
    expect(wrapper.text()).not.toContain("残席");
  });
});

describe("EventDetailWidget — 編集 CTA", () => {
  it("編集ボタンクリックで /events/:id/edit に遷移", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: true,
      value: {
        id: EVENT_ID,
        name: "test",
        start_at: "2026-04-28T10:30:00Z",
        end_at: "2026-04-28T12:30:00Z",
        venue_name: "x",
        capacity: null,
        reserved_count: 0,
        checked_in_count: 0,
        first_time_count: 0,
        waitlist_count: 0,
        description: null,
        venue_id: "v",
        fee: null,
        visibility: "published",
        status: "scheduled",
        cancel_deadline: null,
        created_at: "x",
        updated_at: "x",
      },
    });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    await router.push("/events/test");
    wrapper = mount(EventDetailWidget, {
      props: { eventId: EVENT_ID },
      global: { plugins: [router] },
    });
    await flushPromises();

    const editBtn = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll("button"),
    ).find((b) => b.textContent?.trim() === "編集");
    expect(editBtn).toBeDefined();

    const pushSpy = vi.spyOn(router, "push");
    editBtn!.click();
    expect(pushSpy).toHaveBeenCalledWith({
      name: "events-edit",
      params: { id: EVENT_ID },
    });
  });
});
