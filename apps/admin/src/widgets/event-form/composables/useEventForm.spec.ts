import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, RouterLink, RouterView } from "vue-router";

const { createEventMock, updateEventMock, deleteEventMock, toastMock } =
  vi.hoisted(() => ({
    createEventMock: vi.fn(),
    updateEventMock: vi.fn(),
    deleteEventMock: vi.fn(),
    toastMock: vi.fn(),
  }));

vi.mock("@/entities/event", () => ({
  createEvent: createEventMock,
  updateEvent: updateEventMock,
  deleteEvent: deleteEventMock,
  // 他のテストとの干渉を避けるため最低限を mock
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({
    toast: toastMock,
    toasts: { value: [] },
    dismiss: vi.fn(),
  }),
}));

import { useEventForm } from "./useEventForm";
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
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", component: { template: "<div>list</div>" } },
      { path: "/events/new", component: { template: "<div>new</div>" } },
      {
        path: "/events/:id/edit",
        component: { template: "<div>edit</div>" },
      },
    ],
  });
  return router;
}

function makeHarness(setup: () => void) {
  return defineComponent({
    setup() {
      setup();
      return () => h("div");
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  toastMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useEventForm — Create mode", () => {
  it("初期 state: name / fee は空、startTime/endTime はデフォルト 18:00 / 20:00", async () => {
    const router = buildRouter();
    await router.push("/events/new");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({ mode: "create" });
    });
    mount(C, { global: { plugins: [router] } });
    expect(api!.state.name).toBe("");
    expect(api!.state.fee).toBe("");
    expect(api!.state.startTime).toBe("18:00");
    expect(api!.state.endTime).toBe("20:00");
    expect(api!.isDirty.value).toBe(false);
    // 必須項目（タイトル / 開催日 / 会場）が空のため invalid
    expect(api!.isValid.value).toBe(false);
  });

  it("初期は displayErrors が空 (late validation) — 入力中のエラー非表示", async () => {
    const router = buildRouter();
    await router.push("/events/new");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({ mode: "create" });
    });
    mount(C, { global: { plugins: [router] } });
    // errors は内部評価で正しく出ているが、UI 表示用 displayErrors は空
    expect(Object.keys(api!.errors.value).length).toBeGreaterThan(0);
    expect(api!.displayErrors.value).toEqual({});
  });

  it("バリデーションエラー時の submit: createEvent は呼ばれず、displayErrors が解禁される", async () => {
    const router = buildRouter();
    await router.push("/events/new");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({ mode: "create" });
    });
    mount(C, { global: { plugins: [router] } });
    await api!.submit();
    expect(createEventMock).not.toHaveBeenCalled();
    // submit 押下後は displayErrors が errors と同じになる（UI に表示される）
    expect(api!.displayErrors.value).toEqual(api!.errors.value);
    expect(Object.keys(api!.displayErrors.value).length).toBeGreaterThan(0);
  });

  it("submit でエラー解禁後にフィールドを修正すると displayErrors が即時減る", async () => {
    const router = buildRouter();
    await router.push("/events/new");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({ mode: "create" });
    });
    mount(C, { global: { plugins: [router] } });
    await api!.submit();
    expect(api!.displayErrors.value.name).toBe("タイトルを入力してください");
    api!.state.name = "ゆる練 vol.43";
    await nextTick();
    expect(api!.displayErrors.value.name).toBeUndefined();
  });

  it("reset() で showErrors も初期化される（displayErrors が再び空に）", async () => {
    const router = buildRouter();
    await router.push("/events/new");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({ mode: "create" });
    });
    mount(C, { global: { plugins: [router] } });
    await api!.submit();
    expect(api!.displayErrors.value).not.toEqual({});
    api!.reset();
    expect(api!.displayErrors.value).toEqual({});
  });

  it("成功時に createEvent ペイロードに ISO8601 + JST が含まれ、toast + replace される", async () => {
    createEventMock.mockResolvedValue({
      ok: true,
      value: { ...SAMPLE_EVENT, id: "newid" },
    });
    const router = buildRouter();
    await router.push("/events/new");
    const replaceSpy = vi.spyOn(router, "replace");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({ mode: "create" });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.name = "ゆる練 vol.43";
    api!.state.date = "2026-05-12";
    api!.state.startTime = "19:30";
    api!.state.endTime = "21:30";
    api!.state.venueId = VENUE_ID;
    api!.state.fee = "1500";
    await nextTick();
    await api!.submit();
    expect(createEventMock).toHaveBeenCalledTimes(1);
    const payload = createEventMock.mock.calls[0]![0];
    expect(payload.name).toBe("ゆる練 vol.43");
    expect(payload.start_at).toBe("2026-05-12T19:30:00+09:00");
    expect(payload.end_at).toBe("2026-05-12T21:30:00+09:00");
    expect(payload.venue_id).toBe(VENUE_ID);
    expect(payload.fee).toBe(1500);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "保存しました" }),
    );
    // Create 成功後は一覧画面 (/events) に戻る（履歴を /events/new で汚さない）
    expect(replaceSpy).toHaveBeenCalledWith("/events");
  });

  it("定員入力ありなら payload.capacity に数値が入る / 空欄なら null (#343)", async () => {
    createEventMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push("/events/new");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({ mode: "create" });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.name = "x";
    api!.state.date = "2026-05-12";
    api!.state.startTime = "19:30";
    api!.state.endTime = "21:30";
    api!.state.venueId = VENUE_ID;
    api!.state.capacity = "18";
    await api!.submit();
    expect(createEventMock.mock.calls[0]![0].capacity).toBe(18);

    createEventMock.mockClear();
    api!.state.capacity = "";
    await api!.submit();
    expect(createEventMock.mock.calls[0]![0].capacity).toBeNull();
  });

  it("fee 空欄なら payload.fee = null になる", async () => {
    createEventMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push("/events/new");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({ mode: "create" });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.name = "x";
    api!.state.date = "2026-05-12";
    api!.state.startTime = "19:30";
    api!.state.endTime = "21:30";
    api!.state.venueId = VENUE_ID;
    api!.state.fee = "";
    await api!.submit();
    const payload = createEventMock.mock.calls[0]![0];
    expect(payload.fee).toBeNull();
  });

  it("失敗時は submitError がセットされ、destructive Toast が出る", async () => {
    createEventMock.mockResolvedValue({
      ok: false,
      error: { code: "SERVER_ERROR", message: "boom" },
    });
    const router = buildRouter();
    await router.push("/events/new");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({ mode: "create" });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.name = "x";
    api!.state.date = "2026-05-12";
    api!.state.startTime = "19:30";
    api!.state.endTime = "21:30";
    api!.state.venueId = VENUE_ID;
    await api!.submit();
    expect(api!.submitError.value).toEqual({
      code: "SERVER_ERROR",
      message: "boom",
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "destructive" }),
    );
  });
});

describe("useEventForm — Edit mode", () => {
  it("initialEvent の値が state に hydrate される", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({
        mode: "edit",
        initialEvent: SAMPLE_EVENT,
        eventId: EVENT_ID,
      });
    });
    mount(C, { global: { plugins: [router] } });
    expect(api!.state.name).toBe("ゆる練 vol.42");
    expect(api!.state.date).toBe("2026-05-12");
    expect(api!.state.startTime).toBe("19:30");
    expect(api!.state.endTime).toBe("21:30");
    expect(api!.state.venueId).toBe(VENUE_ID);
    expect(api!.state.fee).toBe("1000");
    expect(api!.isDirty.value).toBe(false);
  });

  it("値変更で isDirty=true になる", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({
        mode: "edit",
        initialEvent: SAMPLE_EVENT,
        eventId: EVENT_ID,
      });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.name = "改題後";
    await nextTick();
    expect(api!.isDirty.value).toBe(true);
  });

  it("Update ペイロードに visibility / description / cancel_deadline / status は含まれず、capacity は含まれる (#343)", async () => {
    updateEventMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({
        mode: "edit",
        initialEvent: SAMPLE_EVENT,
        eventId: EVENT_ID,
      });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.name = "改題後";
    api!.state.fee = "1500";
    api!.state.capacity = "18";
    await nextTick();
    await api!.submit();
    expect(updateEventMock).toHaveBeenCalledTimes(1);
    const [id, patch] = updateEventMock.mock.calls[0]!;
    expect(id).toBe(EVENT_ID);
    expect(patch.name).toBe("改題後");
    expect(patch.fee).toBe(1500);
    expect(patch.capacity).toBe(18);
    expect("visibility" in patch).toBe(false);
    expect("description" in patch).toBe(false);
    expect("cancel_deadline" in patch).toBe(false);
    expect("status" in patch).toBe(false);
  });

  it("定員空欄なら Update ペイロードに capacity:null が送られる (上限なしへ戻す, #343)", async () => {
    updateEventMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({
        mode: "edit",
        initialEvent: SAMPLE_EVENT,
        eventId: EVENT_ID,
      });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.name = "改題後";
    api!.state.capacity = "";
    await nextTick();
    await api!.submit();
    const [, patch] = updateEventMock.mock.calls[0]!;
    expect(patch.capacity).toBeNull();
  });

  it("reservedCount を下回る定員は submit がブロックされ updateEvent は呼ばれない (#343)", async () => {
    updateEventMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({
        mode: "edit",
        initialEvent: SAMPLE_EVENT,
        eventId: EVENT_ID,
        reservedCount: () => 12,
      });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.capacity = "10";
    await nextTick();
    await api!.submit();
    expect(updateEventMock).not.toHaveBeenCalled();
    expect(api!.displayErrors.value.capacity).toBe(
      "現在 12 名の予約があります。定員はこれ以上にしてください",
    );
  });

  it("Update 成功で isDirty が false に戻る", async () => {
    updateEventMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({
        mode: "edit",
        initialEvent: SAMPLE_EVENT,
        eventId: EVENT_ID,
      });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.name = "改題後";
    await nextTick();
    expect(api!.isDirty.value).toBe(true);
    await api!.submit();
    expect(api!.isDirty.value).toBe(false);
  });

  it("Update 成功で /events に遷移し、遷移後に Toast が出る", async () => {
    updateEventMock.mockResolvedValue({ ok: true, value: SAMPLE_EVENT });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    const replaceSpy = vi.spyOn(router, "replace");
    let api: ReturnType<typeof useEventForm>;
    const C = makeHarness(() => {
      api = useEventForm({
        mode: "edit",
        initialEvent: SAMPLE_EVENT,
        eventId: EVENT_ID,
      });
    });
    mount(C, { global: { plugins: [router] } });
    api!.state.name = "改題後";
    await nextTick();
    await api!.submit();
    expect(replaceSpy).toHaveBeenCalledWith("/events");
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "保存しました" }),
    );
    // toast の呼び出しは router.replace の **前** に発火する（モバイル実機で
    // unmount 過渡期に toast 呼び出しがスキップされる事故を防ぐため、
    // entry を先に積んでおく）
    const replaceOrder = replaceSpy.mock.invocationCallOrder[0]!;
    const toastSuccessCall = toastMock.mock.calls.findIndex(
      (c) =>
        typeof c[0] === "object" &&
        c[0] !== null &&
        (c[0] as { title?: string }).title === "保存しました",
    );
    expect(toastSuccessCall).toBeGreaterThanOrEqual(0);
    const toastOrder = toastMock.mock.invocationCallOrder[toastSuccessCall]!;
    expect(toastOrder).toBeLessThan(replaceOrder);
  });
});
