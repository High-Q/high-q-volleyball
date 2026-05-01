import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { deleteEventMock, toastMock } = vi.hoisted(() => ({
  deleteEventMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock("@/entities/event", () => ({
  deleteEvent: deleteEventMock,
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
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useEventDelete", () => {
  it("初期は isOpen=false / isDeleting=false / error=null", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    expect(api!.isOpen.value).toBe(false);
    expect(api!.isDeleting.value).toBe(false);
    expect(api!.deleteError.value).toBeNull();
  });

  it("open() で isOpen=true", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    api!.open();
    expect(api!.isOpen.value).toBe(true);
  });

  it("cancel() で isOpen=false（API 呼ばない）", async () => {
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    api!.open();
    api!.cancel();
    expect(api!.isOpen.value).toBe(false);
    expect(deleteEventMock).not.toHaveBeenCalled();
  });

  it("confirm() 成功で deleteEvent + Toast + redirect", async () => {
    deleteEventMock.mockResolvedValue({ ok: true, value: undefined });
    const router = buildRouter();
    await router.push(`/events/${EVENT_ID}/edit`);
    const pushSpy = vi.spyOn(router, "push");
    let api: ReturnType<typeof useEventDelete>;
    const C = makeHarness((a) => {
      api = a;
    });
    mount(C, { global: { plugins: [router] } });
    api!.open();
    await api!.confirm();
    expect(deleteEventMock).toHaveBeenCalledWith(EVENT_ID);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "削除しました" }),
    );
    expect(pushSpy).toHaveBeenCalledWith("/events");
    expect(api!.isOpen.value).toBe(false);
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
    api!.open();
    await api!.confirm();
    expect(api!.isOpen.value).toBe(true);
    expect(api!.deleteError.value).toEqual({
      code: "SERVER_ERROR",
      message: "boom",
    });
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("RESERVATIONS_EXIST エラーは特別なメッセージにマップされる", () => {
    const msg = getDeleteErrorMessage({
      code: "RESERVATIONS_EXIST",
      message: "FK violation",
    });
    expect(msg).toContain("予約があるため削除できません");
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
    const p = api!.confirm();
    await nextTick();
    expect(api!.isDeleting.value).toBe(true);
    resolveFn!({ ok: true, value: undefined });
    await p;
    expect(api!.isDeleting.value).toBe(false);
  });
});
