import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, ref, type Ref } from "vue";
import {
  unsafeEventId,
  unsafeMemberId,
  unsafeReservationId,
} from "@high-q/shared";
import type { MyReservationDetail } from "@/entities/reservation";

// ---------- mocks ----------
const memberRef = ref<{ id: ReturnType<typeof unsafeMemberId> } | null>({
  id: unsafeMemberId("00000000-0000-0000-0000-000000000001"),
});

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({
    member: memberRef,
    status: ref("authenticated"),
    ready: vi.fn().mockResolvedValue(undefined),
    isProfileComplete: ref(true),
    hasIdentityDocument: ref(true),
  }),
}));

const fetchMyReservationMock = vi.fn();
vi.mock("@/entities/reservation", async () => {
  const actual = await vi.importActual<typeof import("@/entities/reservation")>(
    "@/entities/reservation",
  );
  return {
    ...actual,
    fetchMyReservation: fetchMyReservationMock,
  };
});

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
const RID = "11111111-1111-1111-1111-111111111111";
const FUTURE_START = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
const FUTURE_END = new Date(Date.now() + 26 * 3600 * 1000).toISOString();

const baseReservation: MyReservationDetail = {
  id: unsafeReservationId(RID),
  status: "reserved",
  guestCount: 0,
  note: "",
  createdAt: "2026-04-27T05:32:00Z",
  cancelledAt: null,
  event: {
    id: unsafeEventId("22222222-2222-2222-2222-222222222222"),
    name: "ゆる練 vol.43",
    startAt: FUTURE_START,
    endAt: FUTURE_END,
    fee: 1000,
    venueName: "亀戸スポーツセンター",
    availability: null,
  },
};

// ---------- routing ----------
const Stub = defineComponent({ template: "<div />" });
const routes = [
  { path: "/events", name: "events-list", component: Stub },
  { path: "/history", name: "history", component: Stub },
  {
    path: "/reservations/:reservationId",
    name: "reservation-detail",
    component: Stub,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  memberRef.value = {
    id: unsafeMemberId("00000000-0000-0000-0000-000000000001"),
  };
  cancelSubmitting.value = false;
  cancelError.value = null;
  cancelMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

async function mountPage(reservationId: string = RID) {
  const Page = (await import("./ReservationDetailPage.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push(`/reservations/${reservationId}`);
  await router.isReady();
  const wrapper = mount(Page, {
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, router };
}

describe("ReservationDetailPage - Loading / Success", () => {
  it("初回マウント時 fetchMyReservation を reservationId + member.id で呼ぶ", async () => {
    fetchMyReservationMock.mockResolvedValueOnce(baseReservation);
    await mountPage();
    expect(fetchMyReservationMock).toHaveBeenCalledWith(
      RID,
      "00000000-0000-0000-0000-000000000001",
    );
  });

  it("Success: イベント名 / Dark Fact Card / Meta / Cancel Policy / Cancel CTA を描画する", async () => {
    fetchMyReservationMock.mockResolvedValueOnce(baseReservation);
    const { wrapper } = await mountPage();

    expect(wrapper.find('[data-testid="detail-event-name"]').text()).toBe(
      "ゆる練 vol.43",
    );
    expect(wrapper.find('[data-testid="dark-fact-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="reservation-meta-table"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="cancel-policy-box"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="detail-cancel-button"]').exists()).toBe(
      true,
    );
  });

  it("地図 / カレンダー追加 CTA は描画されない (本 change でドロップ)", async () => {
    fetchMyReservationMock.mockResolvedValueOnce(baseReservation);
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="venue-map-link"]').exists()).toBe(false);
    expect(
      wrapper.find('[data-testid="calendar-export-button"]').exists(),
    ).toBe(false);
  });

  it("予約番号 kicker は #HQ-XXXX-XXXX 形式で生 UUID を出さない", async () => {
    fetchMyReservationMock.mockResolvedValueOnce(baseReservation);
    const { wrapper } = await mountPage();
    const text = wrapper.text();
    expect(text).toMatch(/Reservation #HQ-[0-9A-Z]{4}-[0-9A-Z]{4}/);
    expect(text).not.toContain(RID);
  });

  it("status='cancelled' のときキャンセルボタンは描画されない", async () => {
    fetchMyReservationMock.mockResolvedValueOnce({
      ...baseReservation,
      status: "cancelled",
      cancelledAt: "2026-04-30T00:00:00Z",
    });
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="detail-cancel-button"]').exists()).toBe(
      false,
    );
  });
});

describe("ReservationDetailPage - 404 / Error", () => {
  it("0 行ヒット (他会員 / 存在しない UUID) は 404 状態を描画する", async () => {
    fetchMyReservationMock.mockResolvedValueOnce(null);
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="detail-not-found"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="detail-event-name"]').exists()).toBe(false);
  });

  it("fetchMyReservation throw 時は Error バナーを描画する", async () => {
    fetchMyReservationMock.mockRejectedValueOnce(new Error("network"));
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="detail-error"]').exists()).toBe(true);
  });

  it("member 未確定のときは Loading skeleton を描画する", async () => {
    memberRef.value = null;
    fetchMyReservationMock.mockResolvedValueOnce(baseReservation);
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="detail-loading"]').exists()).toBe(true);
  });
});

describe("ReservationDetailPage - 編集動線 (#215)", () => {
  it("status='reserved' AND 期限内のとき編集 CTA が活性で描画される", async () => {
    fetchMyReservationMock.mockResolvedValueOnce(baseReservation);
    const { wrapper } = await mountPage();
    const cta = wrapper.find('[data-testid="detail-edit-button"]');
    expect(cta.exists()).toBe(true);
    expect(cta.attributes("disabled")).toBeUndefined();
  });

  it("status='cancelled' のとき編集 CTA は描画されない", async () => {
    fetchMyReservationMock.mockResolvedValueOnce({
      ...baseReservation,
      status: "cancelled",
      cancelledAt: "2026-04-30T00:00:00Z",
    });
    const { wrapper } = await mountPage();
    expect(wrapper.find('[data-testid="detail-edit-button"]').exists()).toBe(
      false,
    );
  });

  it("開催当日 0:00 JST 以降は編集 CTA が非活性", async () => {
    fetchMyReservationMock.mockResolvedValueOnce({
      ...baseReservation,
      event: {
        ...baseReservation.event,
        // 過去の startAt
        startAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    });
    const { wrapper } = await mountPage();
    const cta = wrapper.find('[data-testid="detail-edit-button"]');
    expect(cta.exists()).toBe(true);
    expect(cta.attributes("disabled")).toBeDefined();
  });

  it("編集 CTA とキャンセル CTA の間に CancelPolicyBox が挟まれ、視覚的階層が分離している", async () => {
    fetchMyReservationMock.mockResolvedValueOnce(baseReservation);
    const { wrapper } = await mountPage();
    const editCta = wrapper.find('[data-testid="detail-edit-button"]');
    const cancelCta = wrapper.find('[data-testid="detail-cancel-button"]');
    const cancelPolicy = wrapper.find('[data-testid="cancel-policy-box"]');
    expect(editCta.exists()).toBe(true);
    expect(cancelCta.exists()).toBe(true);
    expect(cancelPolicy.exists()).toBe(true);

    // DOM 順序: 編集 CTA → CancelPolicyBox → キャンセル CTA
    const editPos = Array.from(
      document.body.querySelectorAll("*"),
    ).indexOf(editCta.element);
    const policyPos = Array.from(
      document.body.querySelectorAll("*"),
    ).indexOf(cancelPolicy.element);
    const cancelPos = Array.from(
      document.body.querySelectorAll("*"),
    ).indexOf(cancelCta.element);

    expect(editPos).toBeLessThan(policyPos);
    expect(policyPos).toBeLessThan(cancelPos);
  });

  it("BookingSheet からの saved emit で Meta テーブルが新値で再描画される", async () => {
    fetchMyReservationMock.mockResolvedValueOnce({
      ...baseReservation,
      guestCount: 0,
    });
    const { wrapper } = await mountPage();

    // 楽観的更新: saved emit で reservation.guestCount が 2 に書き換わる
    const sheet = wrapper.findComponent({ name: "BookingSheet" });
    sheet.vm.$emit("saved", {
      id: baseReservation.id,
      eventId: baseReservation.event.id,
      memberId: unsafeMemberId("00000000-0000-0000-0000-000000000001"),
      status: "reserved",
      guestCount: 2,
      phoneAtBooking: "090-1111-2222",
      note: "メモ",
    });
    await flushPromises();

    const metaText = wrapper
      .find('[data-testid="reservation-meta-table"]')
      .text();
    expect(metaText).toContain("2 名");
    // 完了トーストが表示される
    expect(wrapper.find('[data-testid="detail-success-notice"]').text()).toContain(
      "変更を保存しました",
    );
  });
});

describe("ReservationDetailPage - キャンセル動線", () => {
  it("キャンセル成功時は /history に遷移する", async () => {
    fetchMyReservationMock.mockResolvedValueOnce(baseReservation);
    cancelMock.mockResolvedValueOnce(true);
    const { wrapper, router } = await mountPage();

    await wrapper.find('[data-testid="detail-cancel-button"]').trigger("click");
    await flushPromises();

    // confirm via mocked dialog: simulate the @confirm event
    wrapper.findComponent({ name: "CancelBookingDialog" }).vm.$emit("confirm");
    await flushPromises();

    expect(cancelMock).toHaveBeenCalledWith(baseReservation.id);
    expect(router.currentRoute.value.name).toBe("history");
  });

  it("キャンセル失敗時 (cancel が false) は /history に遷移しない", async () => {
    fetchMyReservationMock.mockResolvedValueOnce(baseReservation);
    cancelMock.mockResolvedValueOnce(false);
    const { wrapper, router } = await mountPage();

    await wrapper.find('[data-testid="detail-cancel-button"]').trigger("click");
    await flushPromises();
    wrapper.findComponent({ name: "CancelBookingDialog" }).vm.$emit("confirm");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("reservation-detail");
  });
});
