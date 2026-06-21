import { mount, flushPromises, type VueWrapper } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

const {
  getEventDetailMock,
  getEventParticipantsMock,
  useAuthSessionMock,
  signOutMock,
  fetchMemberListRowByIdMock,
  fetchMemberHistoryMock,
} = vi.hoisted(() => ({
  getEventDetailMock: vi.fn(),
  getEventParticipantsMock: vi.fn(),
  useAuthSessionMock: vi.fn(),
  signOutMock: vi.fn(),
  fetchMemberListRowByIdMock: vi.fn(),
  fetchMemberHistoryMock: vi.fn(),
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

vi.mock("@/entities/member", async () => {
  const actual = await vi.importActual<
    typeof import("@/entities/member")
  >("@/entities/member");
  return {
    ...actual,
    fetchMemberListRowById: fetchMemberListRowByIdMock,
    fetchMemberHistory: fetchMemberHistoryMock,
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
      { path: "/", name: "dashboard", component: { template: "<div />" } },
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
  useAuthSessionMock.mockReturnValue({
    signOut: signOutMock,
    session: { value: null },
  });
  fetchMemberListRowByIdMock.mockResolvedValue({ ok: true, value: null });
  fetchMemberHistoryMock.mockResolvedValue({ ok: true, value: [] });
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

  it("ヘッダにタイトル「イベント詳細」が表示され、ログアウトは持たない (#155 シェルへ移設)", async () => {
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
    const logout = Array.from(
      (wrapper.element as HTMLElement).querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("ログアウト"));
    expect(logout).toBeUndefined();
  });

  it("EventDetailWidget からの `member-clicked` で URL に `?detail=<id>` が push される", async () => {
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

    const memberId = "abc-123-def-456";
    const widget = wrapper.findComponent({ name: "EventDetailWidget" });
    widget.vm.$emit("member-clicked", memberId);
    await flushPromises();

    expect(router.currentRoute.value.query.detail).toBe(memberId);
  });

  it("`?detail=<id>` 付きで mount すると MemberDetailSheet にその ID が流れる", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: false,
      error: { code: "EVENT_NOT_FOUND", message: "" },
    });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    const memberId = "55555555-5555-5555-5555-555555555555";
    await router.push(`/events/${EVENT_ID}?detail=${memberId}`);
    wrapper = mount(EventDetailPage, {
      global: { plugins: [router] },
    });
    await flushPromises();

    // sheet 内 composable が ?detail=<id> を購読し、メンバー fetch を発火する
    expect(fetchMemberListRowByIdMock).toHaveBeenCalledWith(memberId);
    expect(fetchMemberHistoryMock).toHaveBeenCalledWith(memberId);
  });

  it("MemberDetailSheet を `close` すると URL から `?detail=` が消える", async () => {
    getEventDetailMock.mockResolvedValue({
      ok: false,
      error: { code: "EVENT_NOT_FOUND", message: "" },
    });
    getEventParticipantsMock.mockResolvedValue({ ok: true, value: [] });
    const router = buildRouter();
    const memberId = "66666666-6666-6666-6666-666666666666";
    await router.push(`/events/${EVENT_ID}?detail=${memberId}`);
    wrapper = mount(EventDetailPage, {
      global: { plugins: [router] },
    });
    await flushPromises();

    const sheet = wrapper.findComponent({ name: "MemberDetailSheet" });
    expect(sheet.exists()).toBe(true);
    // sheet 内部の close() を呼ぶ代わりに、注入された closeDetail を直接実行する
    // （実装上、Esc / overlay click は radix-vue が close() に転送するので等価）
    await (sheet.vm as unknown as { source: { closeDetail: () => Promise<void> } })
      .source.closeDetail();
    await flushPromises();

    expect(router.currentRoute.value.query.detail).toBeUndefined();
  });

});
