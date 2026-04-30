import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { fetchEventsListMock } = vi.hoisted(() => ({
  fetchEventsListMock: vi.fn(),
}));

vi.mock("@/entities/event", async () => {
  const actual = await vi.importActual<typeof import("@/entities/event")>(
    "@/entities/event",
  );
  return {
    ...actual,
    fetchEventsList: fetchEventsListMock,
  };
});

import { useEventsListData } from "./useEventsListData";

async function renderHarness(initialQuery = "") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/events", name: "events", component: { template: "<div />" } },
    ],
  });
  await router.push(`/events${initialQuery ? `?${initialQuery}` : ""}`);
  await router.isReady();

  let captured!: ReturnType<typeof useEventsListData>;
  let assigned = false;
  const Harness = defineComponent({
    setup() {
      captured = useEventsListData();
      assigned = true;
      return () => h("div");
    },
  });
  const wrapper = mount(Harness, { global: { plugins: [router] } });
  await flushPromises();
  if (!assigned) throw new Error("composable not captured");
  return { ...captured, router, wrapper };
}

beforeEach(() => {
  fetchEventsListMock.mockReset();
  fetchEventsListMock.mockResolvedValue({
    ok: true,
    value: { rows: [], total: 0 },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useEventsListData", () => {
  it("初回マウントで fetchEventsList が 1 回呼ばれる", async () => {
    await renderHarness();
    expect(fetchEventsListMock).toHaveBeenCalledTimes(1);
  });

  it("成功時に data / total がセットされる", async () => {
    fetchEventsListMock.mockResolvedValueOnce({
      ok: true,
      value: { rows: [{ id: "x" }], total: 5 },
    });
    const h = await renderHarness();
    expect(h.data.value).toEqual([{ id: "x" }]);
    expect(h.total.value).toBe(5);
    expect(h.isPending.value).toBe(false);
    expect(h.isError.value).toBe(false);
  });

  it("エラー時に isError + errorCode がセットされる", async () => {
    fetchEventsListMock.mockResolvedValueOnce({
      ok: false,
      error: { code: "SERVER_ERROR", message: "boom" },
    });
    const h = await renderHarness();
    expect(h.isError.value).toBe(true);
    expect(h.errorCode.value).toBe("SERVER_ERROR");
  });

  it("filter (period) を変更すると即時 fetch が走る", async () => {
    const h = await renderHarness();
    fetchEventsListMock.mockClear();
    await h.router.replace({ query: { period: "this-month" } });
    await flushPromises();
    expect(fetchEventsListMock).toHaveBeenCalledTimes(1);
    expect(fetchEventsListMock.mock.calls[0]?.[0]?.period).toBe("this-month");
  });

  it("search 変更は 200ms debounce 後に fetch が走る", async () => {
    vi.useFakeTimers();
    const h = await renderHarness();
    fetchEventsListMock.mockClear();
    await h.router.replace({ query: { q: "ゆる練" } });
    // タイマー前: まだ呼ばれていない
    expect(fetchEventsListMock).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(200);
    await flushPromises();
    expect(fetchEventsListMock).toHaveBeenCalledTimes(1);
    expect(fetchEventsListMock.mock.calls[0]?.[0]?.search).toBe("ゆる練");
  });

  it("refetch() で再 fetch される", async () => {
    const h = await renderHarness();
    fetchEventsListMock.mockClear();
    await h.refetch();
    expect(fetchEventsListMock).toHaveBeenCalledTimes(1);
  });

  it("fetch には per=25 が固定で渡る", async () => {
    await renderHarness();
    expect(fetchEventsListMock.mock.calls[0]?.[0]?.per).toBe(25);
  });
});
