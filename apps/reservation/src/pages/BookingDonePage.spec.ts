import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, ref, type Ref } from "vue";
import { unsafeEventId, unsafeVenueId } from "@high-q/shared";
import type { EventDetail } from "@/entities/event";

// ---------- mocks ----------
const eventRef: Ref<EventDetail | null> = ref(null);
const eventLoading = ref(false);
const eventError: Ref<Error | null> = ref(null);
const eventNotFound = ref(false);

vi.mock("@/features/event-detail", () => ({
  useEventDetail: () => ({
    event: eventRef,
    loading: eventLoading,
    error: eventError,
    notFound: eventNotFound,
    reload: vi.fn(),
  }),
}));

const cancelMock = vi.fn();
const cancelSubmitting = ref(false);
const cancelError: Ref<string | null> = ref(null);

vi.mock("@/features/booking", async () => {
  const actual = await vi.importActual<typeof import("@/features/booking")>(
    "@/features/booking",
  );
  return {
    ...actual,
    useCancelBooking: () => ({
      submitting: cancelSubmitting,
      error: cancelError,
      cancel: cancelMock,
      reset: vi.fn(),
    }),
  };
});

// ---------- fixtures ----------
const futureEvent: EventDetail = {
  id: unsafeEventId("ev-1"),
  name: "ゆる練 vol.43",
  startAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  endAt: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
  venueId: unsafeVenueId("vn-1"),
  venueName: "亀戸スポーツセンター",
  fee: 1000,
  meetingPoint: "正面ロビー",
  mapUrl: "https://maps.example.com/kameido",
};

const pastEvent: EventDetail = {
  ...futureEvent,
  startAt: new Date(Date.now() - 60 * 1000).toISOString(),
  endAt: new Date(Date.now() + 60 * 1000).toISOString(),
};

// ---------- routing ----------
const Stub = defineComponent({ template: "<div />" });
const routes = [
  { path: "/events", name: "events-list", component: Stub },
  { path: "/events/:id", name: "event-detail", component: Stub },
  { path: "/events/:id/book/done", name: "booking-done", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  eventRef.value = futureEvent;
  eventLoading.value = false;
  eventError.value = null;
  eventNotFound.value = false;
  cancelSubmitting.value = false;
  cancelError.value = null;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

async function mountPage(query = "?reservation=0a1b2c3d-4e5f-6789-abcd-ef0123456789") {
  const Page = (await import("./BookingDonePage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/events/ev-1/book/done${query}`);
  await router.isReady();
  const wrapper = mount(Page, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, router };
}

describe("BookingDonePage - 基本表示", () => {
  it("予約サマリと予約番号が描画される", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("予約が完了しました");
    expect(wrapper.text()).toContain("ゆる練 vol.43");
    const number = wrapper.find('[data-testid="reservation-number"]').text();
    expect(number).toMatch(/^#HQ-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it("生 UUID が DOM に露出していない", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
  });

  it("メール送信文言と .ics リンクは描画されない (MVP1 スコープアウト)", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).not.toContain("確認メール");
    expect(wrapper.text()).not.toContain(".ics");
    expect(wrapper.text()).not.toContain("カレンダーに追加");
  });

  it("venues.map_url があれば 会場マップリンクが描画される", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="map-link"]').exists()).toBe(true);
  });

  it("venues.map_url が NULL のときは会場マップリンクが描画されない", async () => {
    eventRef.value = { ...futureEvent, mapUrl: null };
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="map-link"]').exists()).toBe(false);
  });

  it("当日連絡用 LINE オープンチャットリンクが常に描画される", async () => {
    const { wrapper } = await mountPage();
    const link = wrapper.find('[data-testid="open-chat-link"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toContain("line.me");
    expect(link.attributes("target")).toBe("_blank");
    expect(wrapper.text()).toContain("社会人バレーボールサークル High Q");
  });
});

describe("BookingDonePage - リダイレクト", () => {
  it("reservation クエリ未指定なら events-list へ replace", async () => {
    const { router } = await mountPage("");
    expect(router.currentRoute.value.name).toBe("events-list");
  });
});

describe("BookingDonePage - キャンセル動線", () => {
  it("開催前ならキャンセル動線が起動 → 確定で events-list へ遷移", async () => {
    cancelMock.mockResolvedValueOnce(true);
    const { wrapper, router } = await mountPage();

    const trigger = wrapper.find('[data-testid="cancel-trigger"]');
    await trigger.trigger("click");
    await flushPromises();

    // AlertDialog の Content は Portal で document.body 配下に描画される
    const confirm = document.body.querySelector(
      '[data-testid="confirm-cancel"]',
    ) as HTMLElement | null;
    expect(confirm).not.toBeNull();
    confirm?.click();
    await flushPromises();

    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe("events-list");
    expect(router.currentRoute.value.query.cancelled).toBe("1");
  });

  it("開催開始以降は確定 CTA が描画されず、不可案内が出る", async () => {
    eventRef.value = pastEvent;
    const { wrapper } = await mountPage();
    const trigger = wrapper.find('[data-testid="cancel-trigger"]');
    await trigger.trigger("click");
    await flushPromises();

    expect(
      document.body.querySelector('[data-testid="confirm-cancel"]'),
    ).toBeNull();
    expect(document.body.textContent ?? "").toContain(
      "キャンセル期限を過ぎています",
    );
    expect(document.body.textContent ?? "").toContain(
      "LINE オープンチャット",
    );
    expect(document.body.textContent ?? "").toContain(
      "社会人バレーボールサークル High Q",
    );
  });

  it("cancel_deadline は判定に使われない (start_at だけで決まる)", async () => {
    // start_at は未来なので cancel_deadline 相当の値が過去でもキャンセル可
    eventRef.value = futureEvent;
    cancelMock.mockResolvedValueOnce(true);
    const { wrapper } = await mountPage();
    await wrapper.find('[data-testid="cancel-trigger"]').trigger("click");
    await flushPromises();
    expect(
      document.body.querySelector('[data-testid="confirm-cancel"]'),
    ).not.toBeNull();
  });
});
