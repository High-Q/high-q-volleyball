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

const memberRef: Ref<{ email: string | null } | null> = ref({
  email: "member@example.com",
});
const sessionRef: Ref<{ user: { email: string | null } } | null> = ref(null);

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    member: memberRef,
    session: sessionRef,
  }),
}));

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
  vol: 43,
  availability: null,
};

const pastEvent: EventDetail = {
  ...futureEvent,
  startAt: new Date(Date.now() - 60 * 1000).toISOString(),
  endAt: new Date(Date.now() + 60 * 1000).toISOString(),
};

// 未来だが満席 → キャンセルは可能（日付基準）だが再予約は不可
const fullFutureEvent: EventDetail = {
  ...futureEvent,
  availability: {
    eventId: unsafeEventId("ev-1"),
    capacity: 10,
    reservedCount: 10,
  },
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
  memberRef.value = { email: "member@example.com" };
  sessionRef.value = null;
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

  it(".ics / カレンダー追加リンクは描画されない (MVP1 スコープアウト維持)", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).not.toContain(".ics");
    expect(wrapper.text()).not.toContain("カレンダーに追加");
  });

  it("メール送信案内行に会員のメールアドレスと迷惑メール促しが描画される", async () => {
    memberRef.value = { email: "owner@example.com" };
    const { wrapper } = await mountPage();
    const note = wrapper.find('[data-testid="email-sent-note"]');
    expect(note.exists()).toBe(true);
    expect(note.text()).toContain("owner@example.com");
    expect(note.text()).toContain("迷惑メール");
  });

  it("session.user.email にフォールバックする (member 未取得時)", async () => {
    memberRef.value = null;
    sessionRef.value = { user: { email: "fallback@example.com" } };
    const { wrapper } = await mountPage();
    const note = wrapper.find('[data-testid="email-sent-note"]');
    expect(note.exists()).toBe(true);
    expect(note.text()).toContain("fallback@example.com");
  });

  it("メールアドレスがどちらも取得できないとき案内行を出さない", async () => {
    memberRef.value = null;
    sessionRef.value = null;
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="email-sent-note"]').exists()).toBe(
      false,
    );
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
  async function confirmCancel(wrapper: { find: (s: string) => { trigger: (e: string) => Promise<void> } }) {
    await wrapper.find('[data-testid="cancel-trigger"]').trigger("click");
    await flushPromises();
    // AlertDialog の Content は Portal で document.body 配下に描画される
    const confirm = document.body.querySelector(
      '[data-testid="confirm-cancel"]',
    ) as HTMLElement | null;
    expect(confirm).not.toBeNull();
    confirm?.click();
    await flushPromises();
  }

  it("受付可能イベントはキャンセル確定後 events-list へ飛ばず再予約導線を表示する", async () => {
    cancelMock.mockResolvedValueOnce(true);
    const { wrapper, router } = await mountPage();

    await confirmCancel(wrapper);

    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe("booking-done");
    expect(
      wrapper.find('[data-testid="booking-cancelled-rebook"]').exists(),
    ).toBe(true);
    expect(wrapper.text()).toContain("やっぱり予約する");
  });

  it("受付不可（満席）イベントはキャンセル確定後 events-list へ遷移する", async () => {
    eventRef.value = fullFutureEvent;
    cancelMock.mockResolvedValueOnce(true);
    const { wrapper, router } = await mountPage();

    await confirmCancel(wrapper);

    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe("events-list");
    expect(router.currentRoute.value.query.cancelled).toBe("1");
  });

  it("再予約導線「やっぱり予約する」で event-detail へ ?book=1 付きで遷移する", async () => {
    cancelMock.mockResolvedValueOnce(true);
    const { wrapper, router } = await mountPage();

    await confirmCancel(wrapper);
    await wrapper.find('[data-testid="booking-rebook"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("event-detail");
    expect(router.currentRoute.value.params.id).toBe("ev-1");
    expect(router.currentRoute.value.query.book).toBe("1");
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
