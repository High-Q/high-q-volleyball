import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

const {
  getEventDetailMock,
  getEventParticipantsMock,
  useAuthSessionMock,
  signOutMock,
} = vi.hoisted(() => ({
  getEventDetailMock: vi.fn(),
  getEventParticipantsMock: vi.fn(),
  useAuthSessionMock: vi.fn(),
  signOutMock: vi.fn(),
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

vi.mock("@/features/auth", () => ({
  useAuthSession: useAuthSessionMock,
}));

import EventDetailPage from "./EventDetailPage.vue";

const EVENT_ID = "00000000-0000-0000-0000-000000000001";

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/login",
        name: "login",
        component: { template: "<div>login</div>" },
      },
      { path: "/events", name: "events", component: { template: "<div />" } },
      {
        path: "/events/:id/edit",
        name: "events-edit",
        component: { template: "<div />" },
      },
      {
        path: "/events/:id",
        name: "events-detail",
        component: EventDetailPage,
      },
    ],
  });
}

let wrapper: VueWrapper | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  signOutMock.mockReset();
  signOutMock.mockResolvedValue(undefined);
  useAuthSessionMock.mockReturnValue({ signOut: signOutMock });
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("EventDetailPage", () => {
  it("router params の id を EventDetailWidget に渡す", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: true,
      value: {
        id: EVENT_ID,
        name: "ゆる練 vol.42",
        start_at: "2026-04-28T10:30:00Z",
        end_at: "2026-04-28T12:30:00Z",
        venue_name: "亀戸",
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
    await router.push(`/events/${EVENT_ID}`);
    wrapper = mount(EventDetailPage, {
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(getEventDetailMock).toHaveBeenCalledWith(EVENT_ID);
    expect(wrapper.text()).toContain("ゆる練 vol.42");
  });

  it("ヘッダにタイトル「イベント詳細」+ ログアウトボタンが表示される", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: false,
      error: { code: "EVENT_NOT_FOUND", message: "" },
    });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}`);
    wrapper = mount(EventDetailPage, {
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("イベント詳細");
    expect(wrapper.text()).toContain("ログアウト");
  });

  it("ログアウトボタンで signOut + /login へ遷移", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: false,
      error: { code: "EVENT_NOT_FOUND", message: "" },
    });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}`);
    wrapper = mount(EventDetailPage, {
      global: { plugins: [router] },
    });
    await flushPromises();

    const logoutBtn = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("ログアウト"));
    expect(logoutBtn).toBeDefined();

    const replaceSpy = vi.spyOn(router, "replace");
    logoutBtn!.click();
    await flushPromises();

    expect(signOutMock).toHaveBeenCalled();
    expect(replaceSpy).toHaveBeenCalledWith({ name: "login" });
  });
});
