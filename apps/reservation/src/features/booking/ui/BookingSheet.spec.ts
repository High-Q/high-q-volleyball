import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, h, ref } from "vue";
import {
  unsafeEventId,
  unsafeMemberId,
  unsafeReservationId,
  unsafeVenueId,
} from "@high-q/shared";
import type { EventDetail } from "@/entities/event";
import type { Member } from "@/entities/member";
import type { Reservation } from "@/entities/reservation";

// ---------- mocks ----------
const memberRef = ref<Member | null>(null);
vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({ member: memberRef }),
}));

const createMock = vi.fn();
const createSubmitting = ref(false);
const createError = ref<string | null>(null);
const createReservationRef = ref<Reservation | null>(null);
const createReset = vi.fn();

vi.mock("../composables/useCreateBooking", () => ({
  useCreateBooking: () => ({
    submitting: createSubmitting,
    error: createError,
    reservation: createReservationRef,
    create: createMock,
    reset: createReset,
  }),
}));

const updateMock = vi.fn();
const updateSubmitting = ref(false);
const updateError = ref<string | null>(null);
const updateReservationRef = ref<Reservation | null>(null);
const updateReset = vi.fn();

vi.mock("../composables/useUpdateBooking", () => ({
  useUpdateBooking: () => ({
    submitting: updateSubmitting,
    error: updateError,
    reservation: updateReservationRef,
    update: updateMock,
    reset: updateReset,
  }),
}));

// ---------- fixtures ----------
const sampleEvent: EventDetail = {
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

const member: Member = {
  id: "mb-1" as unknown as Member["id"],
  email: "misaki@example.com",
  lastName: "田中",
  firstName: "美咲",
  displayName: "田中 美咲",
  nickname: null,
  correctionRequests: [],
  birthday: "1995-03-15",
  phone: "090-1234-5678",
  experienceLevel: "beginner",
  role: "member",
  profile: {},
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const sampleReservation: Reservation = {
  id: unsafeReservationId("0a1b2c3d-4e5f-6789-abcd-ef0123456789"),
  eventId: unsafeEventId("ev-1"),
  memberId: unsafeMemberId("mb-1"),
  status: "reserved",
  guestCount: 0,
  phoneAtBooking: "090-1234-5678",
  note: null,
};

const Stub = defineComponent({ template: "<div />" });
const routes = [
  { path: "/events", name: "events-list", component: Stub },
  { path: "/events/:id", name: "event-detail", component: Stub },
  { path: "/events/:id/book/done", name: "booking-done", component: Stub },
];

beforeEach(() => {
  vi.clearAllMocks();
  memberRef.value = member;
  createSubmitting.value = false;
  createError.value = null;
  createReservationRef.value = null;
  updateSubmitting.value = false;
  updateError.value = null;
  updateReservationRef.value = null;
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
  window.localStorage.clear();
});

async function mountSheet(open = true) {
  const BookingSheet = (await import("./BookingSheet.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/events/ev-1");
  await router.isReady();

  const Host = defineComponent({
    components: { BookingSheet },
    props: { initialOpen: { type: Boolean, default: true } },
    setup(props) {
      const isOpen = ref<boolean>(props.initialOpen);
      return () =>
        h(BookingSheet, {
          open: isOpen.value,
          event: sampleEvent,
          "onUpdate:open": (v: boolean) => {
            isOpen.value = v;
          },
        });
    },
  });

  const wrapper = mount(Host, {
    props: { initialOpen: open },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, router };
}

async function mountEditSheet(opts: {
  open?: boolean;
  startAt?: string;
  initialGuestCount?: number;
  initialNote?: string;
} = {}) {
  const BookingSheet = (await import("./BookingSheet.vue")).default;
  const router = createRouter({ history: createMemoryHistory(), routes });
  await router.push("/reservations/rs-1");
  await router.isReady();

  const evt: EventDetail = {
    ...sampleEvent,
    startAt: opts.startAt ?? sampleEvent.startAt,
  };

  const savedEvents: Reservation[] = [];

  const Host = defineComponent({
    components: { BookingSheet },
    props: { initialOpen: { type: Boolean, default: true } },
    setup(props) {
      const isOpen = ref<boolean>(props.initialOpen);
      return () =>
        h(BookingSheet, {
          open: isOpen.value,
          event: evt,
          mode: "edit",
          edit: {
            reservationId: unsafeReservationId("rs-1"),
            initialGuestCount: opts.initialGuestCount ?? 1,
            initialNote: opts.initialNote ?? "アレルギー: 卵",
          },
          "onUpdate:open": (v: boolean) => {
            isOpen.value = v;
          },
          onSaved: (r: Reservation) => {
            savedEvents.push(r);
          },
        });
    },
  });

  const wrapper = mount(Host, {
    props: { initialOpen: opts.open ?? true },
    global: { plugins: [router] },
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, router, savedEvents };
}

function findInBody(selector: string): HTMLElement | null {
  return document.body.querySelector(selector) as HTMLElement | null;
}

describe("BookingSheet - 基本表示", () => {
  it("open=true で sheet content が描画される", async () => {
    await mountSheet(true);
    expect(findInBody('[role="dialog"]')).not.toBeNull();
  });

  it("open=false で sheet content は描画されない", async () => {
    await mountSheet(false);
    expect(findInBody('[role="dialog"]')).toBeNull();
  });

  it("Sheet 内に同伴者数 stepper / 連絡事項 / 合計金額 が描画される", async () => {
    await mountSheet(true);
    expect(document.body.textContent ?? "").toContain("同伴者人数");
    expect(document.body.textContent ?? "").toContain("連絡事項");
    expect(document.body.textContent ?? "").toContain("1 名 × 1,000 円");
  });

  it("Sheet 内に自己プロフィール (氏名 / メール / 電話 / LEVEL) は描画されない", async () => {
    await mountSheet(true);
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("田中 美咲");
    expect(text).not.toContain("misaki@example.com");
    expect(text).not.toContain("090-1234-5678");
  });

  it("Sheet 内には詳細画面のイベント情報を再表示しない (背後の詳細画面に存在するため)", async () => {
    await mountSheet(true);
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("DATE & TIME");
    expect(text).not.toContain("MEETING POINT");
  });
});

describe("BookingSheet - 合計金額の即時計算", () => {
  it("同伴者数を増やすと合計金額が即時更新される", async () => {
    await mountSheet(true);
    const inc = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.getAttribute("aria-label") === "同伴者人数を増やす") as
      | HTMLButtonElement
      | undefined;
    inc?.click();
    inc?.click();
    await flushPromises();
    expect(document.body.textContent ?? "").toContain("3 名 × 1,000 円");
    expect(document.body.textContent ?? "").toContain("3,000 円");
  });
});

describe("BookingSheet - 予約確定", () => {
  it("「予約を確定する」で create() が呼ばれ、成功で booking-done に router.push", async () => {
    createMock.mockResolvedValueOnce(sampleReservation);
    const { router } = await mountSheet(true);

    const confirm = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("予約を確定する")) as
      | HTMLButtonElement
      | undefined;
    confirm?.click();
    await flushPromises();

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe("booking-done");
    expect(router.currentRoute.value.query.reservation).toBe(
      sampleReservation.id as unknown as string,
    );
  });

  it("phoneAtBooking には members.phone がそのまま渡される", async () => {
    createMock.mockResolvedValueOnce(sampleReservation);
    await mountSheet(true);
    const confirm = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("予約を確定する")) as
      | HTMLButtonElement
      | undefined;
    confirm?.click();
    await flushPromises();
    const arg = createMock.mock.calls[0]?.[0] as { phoneAtBooking: string };
    expect(arg.phoneAtBooking).toBe("090-1234-5678");
  });

  it("確定処理中は CTA が disabled", async () => {
    createSubmitting.value = true;
    await mountSheet(true);
    const confirm = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("確定中")) as
      | HTMLButtonElement
      | undefined;
    expect(confirm?.hasAttribute("disabled")).toBe(true);
  });

  it("重複予約エラーを sheet 内に表示する", async () => {
    createMock.mockImplementationOnce(async () => {
      createError.value = "duplicate";
      return null;
    });
    await mountSheet(true);
    const confirm = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("予約を確定する")) as
      | HTMLButtonElement
      | undefined;
    confirm?.click();
    await flushPromises();
    expect(document.body.textContent ?? "").toContain("既に予約済み");
  });
});

describe("BookingSheet - 戻る CTA", () => {
  it("「戻る」で sheet が閉じ、URL は変わらない", async () => {
    const { router } = await mountSheet(true);
    const initialPath = router.currentRoute.value.fullPath;

    const back = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.trim() === "戻る") as
      | HTMLButtonElement
      | undefined;
    back?.click();
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe(initialPath);
    expect(findInBody('[role="dialog"]')).toBeNull();
  });
});

describe("BookingSheet - ローカル保持", () => {
  it("同伴者数の変更が localStorage に保存される", async () => {
    await mountSheet(true);
    const inc = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.getAttribute("aria-label") === "同伴者人数を増やす") as
      | HTMLButtonElement
      | undefined;
    inc?.click();
    inc?.click();
    await flushPromises();
    const stored = window.localStorage.getItem(
      "hq:reservation-booking:ev-1",
    );
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? "{}") as { guestCount: number };
    expect(parsed.guestCount).toBe(2);
  });
});

// ---------- edit モード ----------

describe("BookingSheet - edit モードの基本表示", () => {
  it("kicker が '— Edit'、CTA が '変更を保存する' で描画される", async () => {
    await mountEditSheet({ initialGuestCount: 1, initialNote: "メモ" });
    const text = document.body.textContent ?? "";
    expect(text).toContain("— Edit");
    expect(text).toContain("変更を保存する");
    expect(text).not.toContain("予約を確定する");
  });

  it("初期値 (guestCount / note) が描画に反映される", async () => {
    await mountEditSheet({ initialGuestCount: 2, initialNote: "アレルギー" });
    const text = document.body.textContent ?? "";
    // 合計人数表記は本人 + 同伴者 = 1 + 2 = 3 名
    expect(text).toContain("3 名 × 1,000 円");
    const ta = document.body.querySelector("textarea") as HTMLTextAreaElement | null;
    expect(ta?.value).toBe("アレルギー");
  });

  it("自己プロフィール (氏名 / 電話) は描画されない", async () => {
    await mountEditSheet();
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("田中 美咲");
    expect(text).not.toContain("090-1234-5678");
  });
});

describe("BookingSheet - edit モードの差分検知", () => {
  it("差分なしの初期状態では「変更を保存する」CTA が disabled", async () => {
    await mountEditSheet({ initialGuestCount: 1, initialNote: "メモ" });
    const submit = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("変更を保存する")) as
      | HTMLButtonElement
      | undefined;
    expect(submit?.hasAttribute("disabled")).toBe(true);
  });

  it("guestCount を変えると CTA が活性化、元に戻すと再 disabled", async () => {
    await mountEditSheet({ initialGuestCount: 1, initialNote: "メモ" });
    const inc = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.getAttribute("aria-label") === "同伴者人数を増やす") as
      | HTMLButtonElement
      | undefined;
    const dec = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.getAttribute("aria-label") === "同伴者人数を減らす") as
      | HTMLButtonElement
      | undefined;
    inc?.click();
    await flushPromises();

    let submit = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("変更を保存する")) as
      | HTMLButtonElement
      | undefined;
    expect(submit?.hasAttribute("disabled")).toBe(false);

    dec?.click();
    await flushPromises();
    submit = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("変更を保存する")) as
      | HTMLButtonElement
      | undefined;
    expect(submit?.hasAttribute("disabled")).toBe(true);
  });
});

describe("BookingSheet - edit モードの localStorage 非接触", () => {
  it("edit モードで sheet を開いて値を変更しても localStorage に書き込まれない", async () => {
    await mountEditSheet({ initialGuestCount: 1, initialNote: "" });
    const inc = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.getAttribute("aria-label") === "同伴者人数を増やす") as
      | HTMLButtonElement
      | undefined;
    inc?.click();
    inc?.click();
    await flushPromises();
    expect(
      window.localStorage.getItem("hq:reservation-booking:ev-1"),
    ).toBeNull();
  });
});

describe("BookingSheet - edit モードの保存", () => {
  it("「変更を保存する」で update() が呼ばれ、成功で saved emit + sheet close", async () => {
    updateMock.mockResolvedValueOnce(sampleReservation);
    const { savedEvents, wrapper } = await mountEditSheet({
      initialGuestCount: 1,
      initialNote: "",
    });
    const inc = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.getAttribute("aria-label") === "同伴者人数を増やす") as
      | HTMLButtonElement
      | undefined;
    inc?.click();
    await flushPromises();

    const submit = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("変更を保存する")) as
      | HTMLButtonElement
      | undefined;
    submit?.click();
    await flushPromises();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const args = updateMock.mock.calls[0];
    expect(args?.[0]).toMatchObject({
      reservationId: "rs-1",
      guestCount: 2,
      note: "",
    });
    expect(savedEvents).toHaveLength(1);
    expect(savedEvents[0]?.id).toBe(sampleReservation.id);
    expect(findInBody('[role="dialog"]')).toBeNull();
    void wrapper;
  });

  it("RLS エラー時は sheet に留まりエラー表示", async () => {
    updateMock.mockImplementationOnce(async () => {
      updateError.value = "rls";
      return null;
    });
    await mountEditSheet({ initialGuestCount: 1, initialNote: "" });
    const inc = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.getAttribute("aria-label") === "同伴者人数を増やす") as
      | HTMLButtonElement
      | undefined;
    inc?.click();
    await flushPromises();
    const submit = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("変更を保存する")) as
      | HTMLButtonElement
      | undefined;
    submit?.click();
    await flushPromises();
    expect(findInBody('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent ?? "").toContain("変更できません");
  });
});

describe("BookingSheet - edit モードの期限切れ案内", () => {
  it("開催当日 0:00 JST 以降 (= 過去 startAt) では期限切れ案内が描画され、CTA が disabled", async () => {
    await mountEditSheet({
      startAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      initialGuestCount: 1,
      initialNote: "",
    });
    const text = document.body.textContent ?? "";
    expect(text).toContain("キャンセル期限");
    expect(text).toContain("LINE オープンチャット");

    // 値を変えても CTA は disabled
    const inc = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.getAttribute("aria-label") === "同伴者人数を増やす") as
      | HTMLButtonElement
      | undefined;
    inc?.click();
    await flushPromises();
    const submit = Array.from(
      document.body.querySelectorAll("button"),
    ).find((b) => b.textContent?.includes("変更を保存する")) as
      | HTMLButtonElement
      | undefined;
    expect(submit?.hasAttribute("disabled")).toBe(true);
  });
});
