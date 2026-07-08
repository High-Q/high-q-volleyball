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
const myReservationRef = ref<unknown>(null);
const selfResolvedRef = ref(false);

const Stub = defineComponent({ template: "<div />" });

vi.mock("@/features/event-detail", () => ({
  useEventDetail: () => ({
    event: eventRef,
    loading: eventLoading,
    error: eventError,
    notFound: eventNotFound,
    reload: vi.fn(),
  }),
  useMyEventReservation: () => ({
    myReservation: myReservationRef,
    resolved: selfResolvedRef,
    loading: ref(false),
    reload: vi.fn(),
    setLocal: vi.fn(),
  }),
  EventInfoBlock: Stub,
  EventStickyCta: Stub,
}));

// BookingSheet は open prop を data 属性に反映するスタブに差し替える
const BookingSheetStub = defineComponent({
  props: { open: { type: Boolean, default: false } },
  template: '<div data-testid="booking-sheet" :data-open="open" />',
});

vi.mock("@/features/booking", async () => {
  const actual = await vi.importActual<typeof import("@/features/booking")>(
    "@/features/booking",
  );
  return { ...actual, BookingSheet: BookingSheetStub };
});

// ---------- fixtures ----------
const futureEvent: EventDetail = {
  id: unsafeEventId("ev-1"),
  name: "ゆる練",
  startAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  endAt: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
  venueId: unsafeVenueId("vn-1"),
  venueName: "亀戸スポーツセンター",
  fee: 1000,
  meetingPoint: "正面ロビー",
  mapUrl: null,
  vol: 74,
  availability: null,
};

const pastEvent: EventDetail = {
  ...futureEvent,
  startAt: new Date(Date.now() - 60 * 1000).toISOString(),
  endAt: new Date(Date.now() + 60 * 1000).toISOString(),
};

const fullFutureEvent: EventDetail = {
  ...futureEvent,
  availability: {
    eventId: unsafeEventId("ev-1"),
    capacity: 10,
    reservedCount: 10,
  },
};

const routes = [
  { path: "/events", name: "events-list", component: Stub },
  { path: "/events/:id", name: "event-detail", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  eventRef.value = futureEvent;
  eventLoading.value = false;
  eventError.value = null;
  eventNotFound.value = false;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

async function mountPage(query = "") {
  const Page = (await import("./EventDetailPage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/events/ev-1${query}`);
  await router.isReady();
  const wrapper = mount(Page, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

function sheetOpen(wrapper: { find: (s: string) => { attributes: (a: string) => string | undefined } }) {
  return wrapper.find('[data-testid="booking-sheet"]').attributes("data-open");
}

describe("EventDetailPage - 予約 Sheet ディープリンク (?book=1)", () => {
  it("受付可能イベントに ?book=1 で到達すると Sheet が自動オープンする", async () => {
    const { wrapper, router } = await mountPage("?book=1");
    expect(sheetOpen(wrapper)).toBe("true");
    // 再オープン防止のため book クエリは除去される
    expect(router.currentRoute.value.query.book).toBeUndefined();
  });

  it("受付終了（開催済）イベントでは ?book=1 でも Sheet を開かない", async () => {
    eventRef.value = pastEvent;
    const { wrapper, router } = await mountPage("?book=1");
    expect(sheetOpen(wrapper)).toBe("false");
    expect(router.currentRoute.value.query.book).toBeUndefined();
  });

  it("満席イベントでは ?book=1 でも Sheet を開かない", async () => {
    eventRef.value = fullFutureEvent;
    const { wrapper } = await mountPage("?book=1");
    expect(sheetOpen(wrapper)).toBe("false");
  });

  it("book クエリなしでは Sheet を開かない", async () => {
    const { wrapper } = await mountPage("");
    expect(sheetOpen(wrapper)).toBe("false");
  });
});

describe("EventDetailPage - イベント名見出しの vol editorial 表示", () => {
  it("vol があれば vol.NN を mono+accent span で改行強調する", async () => {
    eventRef.value = { ...futureEvent, name: "ゆる練", vol: 74 };
    const { wrapper } = await mountPage("");

    const title = wrapper.find('[data-testid="event-title"]');
    expect(title.exists()).toBe(true);
    expect(title.text()).toContain("ゆる練");

    const volume = wrapper.find('[data-testid="event-title-volume"]');
    expect(volume.exists()).toBe(true);
    expect(volume.text()).toBe("vol.74");
    expect(volume.classes()).toContain("text-accent");
    expect(volume.classes()).toContain("font-mono");
  });

  it("vol が null なら名前のみ大見出し（vol 行なし fallback）", async () => {
    eventRef.value = { ...futureEvent, name: "特別練習会", vol: null };
    const { wrapper } = await mountPage("");

    const title = wrapper.find('[data-testid="event-title"]');
    expect(title.text()).toBe("特別練習会");
    expect(
      wrapper.find('[data-testid="event-title-volume"]').exists(),
    ).toBe(false);
  });
});
