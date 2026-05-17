import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { deleteEventMock, classifyEventReservationsMock, toastMock } =
  vi.hoisted(() => ({
    deleteEventMock: vi.fn(),
    classifyEventReservationsMock: vi.fn(),
    toastMock: vi.fn(),
  }));

vi.mock("@/entities/event", () => ({
  deleteEvent: deleteEventMock,
  classifyEventReservations: classifyEventReservationsMock,
}));

vi.mock("@/shared/ui/useToast", () => ({
  useToast: () => ({
    toast: toastMock,
    toasts: { value: [] },
    dismiss: vi.fn(),
  }),
}));

import {
  useEventDelete,
  getDeleteErrorMessage,
} from "./useEventDelete";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";

const EMPTY_BREAKDOWN = {
  reserved: 0,
  attended: 0,
  cancelled: 0,
  no_show: 0,
  waitlist: 0,
};

function buildRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", component: { template: "<div>list</div>" } },
      {
        path: "/events/:id/edit",
        component: { template: "<div>edit</div>" },
      },
    ],
  });
}

function makeHarness(
  setup: (api: ReturnType<typeof useEventDelete>) => void,
) {
  return defineComponent({
    setup() {
      const api = useEventDelete(EVENT_ID);
      setup(api);
      return () => h("div");
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  toastMock.mockReset();
  classifyEventReservationsMock.mockResolvedValue({
    ok: true,
    value: EMPTY_BREAKDOWN,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useEventDelete", () => {
  it("初期は isOpen=false / isDeleting=false / breakdown=null", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    expect(api!.isOpen.value).toBe(false);
    expect(api!.isDeleting.value).toBe(false);
    expect(api!.breakdown.value).toBeNull();
    expect(api!.deleteError.value).toBeNull();
  });

  it("open() で isOpen=true + classifyEventReservations を呼んで breakdown を埋める", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: true,
      value: { ...EMPTY_BREAKDOWN, reserved: 3, cancelled: 1 },
    });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    await api!.open();
    expect(api!.isOpen.value).toBe(true);
    expect(classifyEventReservationsMock).toHaveBeenCalledWith(EVENT_ID);
    expect(api!.breakdown.value).toEqual({
      reserved: 3,
      attended: 0,
      cancelled: 1,
      no_show: 0,
      waitlist: 0,
    });
    expect(api!.breakdownError.value).toBeNull();
  });

  it("breakdown 取得失敗時は breakdownError がセットされ canConfirm=false", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: "rls" },
    });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    await api!.open();
    expect(api!.breakdownError.value).toEqual({
      code: "PERMISSION_DENIED",
      message: "rls",
    });
    expect(api!.canConfirm.value).toBe(false);
  });

  it("breakdown 取得成功時は canConfirm=true", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    await api!.open();
    expect(api!.canConfirm.value).toBe(true);
  });

  it("cancel() で isOpen=false（API 呼ばない）", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    await api!.open();
    api!.cancel();
    expect(api!.isOpen.value).toBe(false);
    expect(deleteEventMock).not.toHaveBeenCalled();
  });

  it("confirm() 成功・予約 0 件で Toast「削除しました」", async () => {
    deleteEventMock.mockResolvedValue({ ok: true, value: undefined });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    const pushSpy = vi.spyOn(router, "push");
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    await api!.open();
    await api!.confirm();
    expect(deleteEventMock).toHaveBeenCalledWith(EVENT_ID);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "削除しました" }),
    );
    expect(pushSpy).toHaveBeenCalledWith("/events");
    expect(api!.isOpen.value).toBe(false);
  });

  it("confirm() 成功・予約あり時は Toast に件数を含む", async () => {
    classifyEventReservationsMock.mockResolvedValue({
      ok: true,
      value: { ...EMPTY_BREAKDOWN, reserved: 2, cancelled: 1 },
    });
    deleteEventMock.mockResolvedValue({ ok: true, value: undefined });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    await api!.open();
    await api!.confirm();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "削除しました（3 件の予約も整理されました）",
      }),
    );
  });

  it("confirm() 失敗時は Dialog を閉じず deleteError をセット", async () => {
    deleteEventMock.mockResolvedValue({
      ok: false,
      error: { code: "SERVER_ERROR", message: "boom" },
    });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    await api!.open();
    await api!.confirm();
    expect(api!.isOpen.value).toBe(true);
    expect(api!.deleteError.value).toEqual({
      code: "SERVER_ERROR",
      message: "boom",
    });
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("PERMISSION_DENIED エラーは権限メッセージにマップされる", () => {
    const msg = getDeleteErrorMessage({
      code: "PERMISSION_DENIED",
      message: "rls",
    });
    expect(msg).toContain("権限がありません");
  });

  it("isDeleting は API 呼び出し中 true → 完了で false", async () => {
    let resolveFn: (v: unknown) => void;
    deleteEventMock.mockImplementation(
      () =>
        new Promise((r) => {
          resolveFn = r;
        }),
    );
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    await api!.open();
    const p = api!.confirm();
    await nextTick();
    expect(api!.isDeleting.value).toBe(true);
    resolveFn!({ ok: true, value: undefined });
    await p;
    expect(api!.isDeleting.value).toBe(false);
  });

  it("canConfirm は isDeleting 中は false", async () => {
    let resolveFn: (v: unknown) => void;
    deleteEventMock.mockImplementation(
      () =>
        new Promise((r) => {
          resolveFn = r;
        }),
    );
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    await api!.open();
    expect(api!.canConfirm.value).toBe(true);
    const p = api!.confirm();
    await nextTick();
    expect(api!.canConfirm.value).toBe(false);
    resolveFn!({ ok: true, value: undefined });
    await p;
  });
});
