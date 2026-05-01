import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const {
  getEventByIdMock,
  useVenuesMock,
  useVolumeSuggestMock,
  toastMock,
} = vi.hoisted(() => ({
  getEventByIdMock: vi.fn(),
  useVenuesMock: vi.fn(),
  useVolumeSuggestMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@/entities/event", async () => {
  const actual = await vi.importActual<typeof import("@/entities/event")>(
    "@/entities/event",
  );
  return {
    ...actual,
    getEventById: getEventByIdMock,
  };
});

vi.mock("@/entities/venue", () => ({
  useVenues: useVenuesMock,
}));

vi.mock("@/widgets/event-form/composables/useVolumeSuggest", () => ({
  useVolumeSuggest: useVolumeSuggestMock,
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({
    toast: toastMock,
    toasts: { value: [] },
    dismiss: vi.fn(),
  }),
}));

import EventEditPage from "./EventEditPage.vue";
import type { Event } from "@high-q/shared";

const VENUE_ID = "11111111-1111-4111-8111-111111111111";
const EVENT_ID = "22222222-2222-4222-8222-222222222222";

const SAMPLE_EVENT: Event = {
  id: EVENT_ID as unknown as Event["id"],
  name: "ゆる練 vol.42",
  description: null,
  start_at: "2026-05-12T19:30:00+09:00",
  end_at: "2026-05-12T21:30:00+09:00",
  venue_id: VENUE_ID as unknown as Event["venue_id"],
  fee: 1000,
  capacity: null,
  visibility: "published",
  status: "scheduled",
  cancel_deadline: null,
  created_by: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", component: { template: "<div>list</div>" } },
      {
        path: "/events/:id/edit",
        component: { template: "<div />" },
      },
    ],
  });
}

beforeEach(() => {
  useVenuesMock.mockReturnValue({
    venues: ref([{ id: VENUE_ID, name: "亀戸スポーツセンター" }]),
    reload: vi.fn(),
  });
  useVolumeSuggestMock.mockReturnValue({ suggestion: ref(undefined) });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("EventEditPage", () => {
  it("Loading 状態で Skeleton が表示される", async () => {
    getEventByIdMock.mockImplementation(() => new Promise(() => {}));
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    await router.isReady();
    const wrapper = mount(EventEditPage, { global: { plugins: [router] } });
    // Skeleton primitive を確認
    expect(wrapper.findAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it("取得成功で EventForm に値が hydrate される", async () => {
    getEventByIdMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    await router.isReady();
    const wrapper = mount(EventEditPage, { global: { plugins: [router] } });
    await flushPromises();
    const inputs = wrapper.findAll("input").map((i) => i.element.value);
    expect(inputs).toContain("ゆる練 vol.42");
    expect(inputs).toContain("2026-05-12");
  });

  it("Error 状態で role='alert' + 一覧へ戻る CTA", async () => {
    getEventByIdMock.mockResolvedValue({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "rls" },
    });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    await router.isReady();
    const wrapper = mount(EventEditPage, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("一覧へ戻る");
    expect(wrapper.text()).toContain("PERMISSION_DENIED");
  });

  it("event が見つからない（null）場合も Error 状態に", async () => {
    getEventByIdMock.mockResolvedValue({ ok: true, value: null });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    await router.isReady();
    const wrapper = mount(EventEditPage, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("一覧へ戻る");
  });

  it("Success 状態で削除ボタンが表示される（EventDeleteDialog がマウントされる）", async () => {
    getEventByIdMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    await router.isReady();
    const wrapper = mount(EventEditPage, { global: { plugins: [router] } });
    await flushPromises();
    expect(wrapper.text()).toContain("削除");
    expect(wrapper.text()).toContain("保存");
  });
});
