import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, ref, type Ref } from "vue";
import {
  unsafeEventId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import type { EventId, EventListItem } from "@/entities/event";
import type {
  MyReservationItem,
  ReservationId,
} from "@/entities/reservation";

// ---------- mocks ----------
const memberRef = ref<{ displayName: string; nickname: string | null } | null>({
  displayName: "山田 美咲",
  nickname: "みさき",
});
const sessionRef = ref<{ user: { id: string } } | null>({
  user: { id: "00000000-0000-0000-0000-000000000001" },
});

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    member: memberRef,
    session: sessionRef,
    status: ref("authenticated"),
    ready: vi.fn().mockResolvedValue(undefined),
    isProfileComplete: ref(true),
    hasIdentityDocument: ref(true),
  }),
}));

const upcomingState = {
  events: ref<EventListItem[]>([]),
  loading: ref<boolean>(false),
  error: ref<Error | null>(null),
  reload: vi.fn(),
};
const nextState = {
  reservation: ref<MyReservationItem | null>(null),
  mineByEventId: ref<ReadonlyMap<EventId, ReservationId>>(new Map()),
  waitlistByEventId: ref<ReadonlyMap<EventId, ReservationId>>(new Map()),
  loading: ref<boolean>(false),
  error: ref<Error | null>(null),
  reload: vi.fn(),
};

vi.mock("@/features/event-listing", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/event-listing")
  >("@/features/event-listing");
  return {
    ...actual,
    useUpcomingEvents: () => upcomingState,
    useNextReservation: () => nextState,
  };
});

// ---------- fixtures ----------
const eventA: EventListItem = {
  id: unsafeEventId("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
  name: "ゆる練 vol.43",
  startAt: "2026-05-12T10:30:00Z",
  endAt: "2026-05-12T12:30:00Z",
  venueId: unsafeVenueId("11111111-1111-1111-1111-111111111111"),
  venueName: "亀戸スポーツセンター",
  vol: null,
  fee: 1000,
  availability: null,
};

const eventB: EventListItem = {
  id: unsafeEventId("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
  name: "ゆる練 vol.44",
  startAt: "2026-05-19T10:30:00Z",
  endAt: "2026-05-19T12:30:00Z",
  venueId: unsafeVenueId("11111111-1111-1111-1111-111111111111"),
  venueName: "亀戸スポーツセンター",
  vol: null,
  fee: 1000,
  availability: null,
};

const reservationOnA: MyReservationItem = {
  id: unsafeReservationId("11112222-3333-4444-5555-666677778888"),
  status: "reserved",
  guestCount: 0,
  cancelledAt: null,
  event: {
    id: eventA.id,
    name: eventA.name,
    startAt: eventA.startAt,
    endAt: eventA.endAt,
    fee: eventA.fee,
    venueName: eventA.venueName,
    vol: null,
    availability: null,
  },
};

// ---------- routing ----------
const Stub = defineComponent({ template: "<div />" });
const routes = [
  { path: "/", name: "home", redirect: { name: "events-list" } },
  { path: "/events", name: "events-list", component: Stub },
  { path: "/events/:id", name: "event-detail", component: Stub },
  {
    path: "/reservations/:reservationId",
    name: "reservation-detail",
    component: Stub,
  },
  { path: "/profile", name: "profile", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  memberRef.value = {
    displayName: "山田 美咲",
    nickname: "みさき",
  };
  sessionRef.value = { user: { id: "00000000-0000-0000-0000-000000000001" } };
  upcomingState.events.value = [];
  upcomingState.loading.value = false;
  upcomingState.error.value = null;
  nextState.reservation.value = null;
  nextState.mineByEventId.value = new Map();
  nextState.waitlistByEventId.value = new Map();
  nextState.loading.value = false;
  nextState.error.value = null;
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

async function mountPage() {
  const Page = (await import("./EventsListPage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/events");
  await router.isReady();
  const wrapper = mount(Page, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, router };
}

describe("EventsListPage - ヘッダ", () => {
  it("HomeHeader (ロゴ + アバター) が描画される", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="home-header-logo"]').text()).toBe(
      "High Q",
    );
    expect(wrapper.find('[data-testid="home-header-avatar"]').text()).toBe("み");
  });

  it("挨拶 kicker に表示名が含まれる", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.text()).toContain("こんにちは、みさきさん");
  });

  it("PageBreadcrumb は描画されない (ホームはルート画面)", async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.find('nav[aria-label="パンくず"]').exists()).toBe(false);
    // PageBreadcrumb component が mount されていないこと
    expect(
      wrapper.findComponent({ name: "PageBreadcrumb" }).exists(),
    ).toBe(false);
  });
});

describe("EventsListPage - NEXT カード", () => {
  it("予約あり時: HomeNextCard が描画される", async () => {
    nextState.reservation.value = reservationOnA;
    upcomingState.events.value = [eventA];
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="home-next-card"]').exists()).toBe(true);
  });

  it("予約 0 件時: HomeNextCard は描画されない", async () => {
    nextState.reservation.value = null;
    upcomingState.events.value = [eventA, eventB];
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="home-next-card"]').exists()).toBe(false);
  });

  it("NEXT カードは予約詳細画面 (/reservations/:reservationId) への router-link を持つ", async () => {
    nextState.reservation.value = reservationOnA;
    const { wrapper } = await mountPage();
    const link = wrapper.find('[data-testid="home-next-card"]');
    // router-link は a タグとして resolve される
    expect(link.attributes("href")).toBe(
      `/reservations/${reservationOnA.id}`,
    );
  });
});

describe("EventsListPage - 他のイベント", () => {
  it("NEXT カード対象のイベントは「他のイベント」から除外される", async () => {
    nextState.reservation.value = reservationOnA;
    upcomingState.events.value = [eventA, eventB];
    const { wrapper } = await mountPage();
    const rows = wrapper.findAll('[data-testid="event-row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text()).toContain("ゆる練 vol.44");
    expect(wrapper.text()).not.toMatch(/他のイベント · 2/);
  });

  it("NEXT 0 件時は upcoming events の全件が「他のイベント」に並ぶ", async () => {
    nextState.reservation.value = null;
    upcomingState.events.value = [eventA, eventB];
    const { wrapper } = await mountPage();
    const rows = wrapper.findAll('[data-testid="event-row"]');
    expect(rows).toHaveLength(2);
    expect(wrapper.text()).toContain("他のイベント · 2");
  });

  it("EventRow 押下で /events/:id への router-link を持つ", async () => {
    nextState.reservation.value = null;
    upcomingState.events.value = [eventA];
    const { wrapper } = await mountPage();
    const row = wrapper.find('[data-testid="event-row"]');
    expect(row.attributes("href")).toBe(`/events/${eventA.id}`);
  });

  describe("自分予約あり行 (mineByEventId 経由)", () => {
    const reservationOnB = unsafeReservationId(
      "99998888-7777-6666-5555-444433332222",
    );

    it("自分予約あり行は /reservations/:reservationId への router-link を持つ", async () => {
      nextState.reservation.value = reservationOnA; // NEXT = eventA
      nextState.mineByEventId.value = new Map([
        [eventA.id, reservationOnA.id],
        [eventB.id, reservationOnB],
      ]);
      upcomingState.events.value = [eventA, eventB];
      const { wrapper } = await mountPage();
      // eventA は NEXT で除外。残るのは eventB (自分予約あり 2 件目)
      const rows = wrapper.findAll('[data-testid="event-row"]');
      expect(rows).toHaveLength(1);
      expect(rows[0]?.attributes("href")).toBe(
        `/reservations/${reservationOnB}`,
      );
    });

    it("自分予約あり行のみに「予約済」 chip が描画される", async () => {
      // eventC は自分予約なし
      const eventC: EventListItem = {
        ...eventB,
        id: unsafeEventId("cccccccc-cccc-cccc-cccc-cccccccccccc"),
        name: "ゆる練 vol.45",
      };
      nextState.reservation.value = null; // NEXT なし
      nextState.mineByEventId.value = new Map([[eventB.id, reservationOnB]]);
      upcomingState.events.value = [eventB, eventC];
      const { wrapper } = await mountPage();
      const rows = wrapper.findAll('[data-testid="event-row"]');
      expect(rows).toHaveLength(2);
      // 1 行目 (eventB): 予約済 chip あり、reservation-detail へ
      expect(
        rows[0]?.find('[data-testid="event-row-mine-badge"]').exists(),
      ).toBe(true);
      expect(rows[0]?.attributes("href")).toBe(
        `/reservations/${reservationOnB}`,
      );
      // 2 行目 (eventC): 予約済 chip なし、event-detail へ
      expect(
        rows[1]?.find('[data-testid="event-row-mine-badge"]').exists(),
      ).toBe(false);
      expect(rows[1]?.attributes("href")).toBe(`/events/${eventC.id}`);
    });

    it("自分予約マップが空のとき: 「予約済」 chip は 1 つも描画されず、全行が /events/:id を指す", async () => {
      nextState.reservation.value = null;
      nextState.mineByEventId.value = new Map();
      upcomingState.events.value = [eventA, eventB];
      const { wrapper } = await mountPage();
      const rows = wrapper.findAll('[data-testid="event-row"]');
      expect(
        wrapper.findAll('[data-testid="event-row-mine-badge"]'),
      ).toHaveLength(0);
      expect(rows[0]?.attributes("href")).toBe(`/events/${eventA.id}`);
      expect(rows[1]?.attributes("href")).toBe(`/events/${eventB.id}`);
    });
  });
});

describe("EventsListPage - 4 状態", () => {
  it("Loading: NEXT placeholder + 行 placeholder が描画される", async () => {
    nextState.loading.value = true;
    upcomingState.loading.value = true;
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="home-loading-next"]').exists()).toBe(
      true,
    );
    expect(
      wrapper.findAll('[data-testid="home-loading-row"]').length,
    ).toBeGreaterThan(0);
  });

  it("Error: エラーバナーと再試行ボタンが描画される", async () => {
    nextState.error.value = new Error("boom");
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="home-error"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("再試行");
  });

  it("Empty: 予約 0 + 他 0 のとき空メッセージが描画される", async () => {
    nextState.reservation.value = null;
    upcomingState.events.value = [];
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="home-empty"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("現在開催予定のイベントはありません");
  });

  it("正常 (NEXT のみ): 他のイベントが NEXT のみのとき他のイベントセクションは描画されない", async () => {
    nextState.reservation.value = reservationOnA;
    upcomingState.events.value = [eventA]; // NEXT で除外され 0 件
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="home-next-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="home-other-events"]').exists()).toBe(
      false,
    );
    // NEXT がある以上 Empty 状態にもしない
    expect(wrapper.find('[data-testid="home-empty"]').exists()).toBe(false);
  });
});
