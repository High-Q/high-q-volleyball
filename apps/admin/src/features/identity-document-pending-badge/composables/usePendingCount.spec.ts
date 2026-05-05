import { mount, flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

const fetchPendingCountMock = vi.fn();

vi.mock("@/entities/identity-document", () => ({
  fetchPendingCount: () => fetchPendingCountMock(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchPendingCountMock.mockResolvedValue({ ok: true, value: 0 });
});

afterEach(async () => {
  const { _resetPendingCountForTest } = await import("./usePendingCount");
  _resetPendingCountForTest();
});

describe("usePendingCount — fetch on mount", () => {
  it("マウント時に fetchPendingCount を呼ぶ", async () => {
    fetchPendingCountMock.mockResolvedValue({ ok: true, value: 3 });
    const { usePendingCount } = await import("./usePendingCount");
    const Harness = defineComponent({
      setup() {
        const c = usePendingCount();
        return () => h("div", c.count.value);
      },
    });
    mount(Harness);
    await flushPromises();
    expect(fetchPendingCountMock).toHaveBeenCalledTimes(1);
  });

  it("成功時に count が反映される", async () => {
    fetchPendingCountMock.mockResolvedValue({ ok: true, value: 7 });
    const { usePendingCount } = await import("./usePendingCount");
    let captured!: ReturnType<typeof usePendingCount>;
    const Harness = defineComponent({
      setup() {
        captured = usePendingCount();
        return () => h("div");
      },
    });
    mount(Harness);
    await flushPromises();
    expect(captured.count.value).toBe(7);
    expect(captured.error.value).toBeNull();
  });

  it("失敗時に error が反映され count は 0 のまま", async () => {
    fetchPendingCountMock.mockResolvedValue({
      ok: false,
      error: { code: "SERVER_ERROR", message: "denied" },
    });
    const { usePendingCount } = await import("./usePendingCount");
    let captured!: ReturnType<typeof usePendingCount>;
    const Harness = defineComponent({
      setup() {
        captured = usePendingCount();
        return () => h("div");
      },
    });
    mount(Harness);
    await flushPromises();
    expect(captured.count.value).toBe(0);
    expect(captured.error.value?.code).toBe("SERVER_ERROR");
  });
});

describe("usePendingCount — refresh()", () => {
  it("refresh() 呼び出しで再 fetch される", async () => {
    fetchPendingCountMock.mockResolvedValueOnce({ ok: true, value: 3 });
    const { usePendingCount } = await import("./usePendingCount");
    let captured!: ReturnType<typeof usePendingCount>;
    const Harness = defineComponent({
      setup() {
        captured = usePendingCount();
        return () => h("div");
      },
    });
    mount(Harness);
    await flushPromises();
    expect(captured.count.value).toBe(3);

    fetchPendingCountMock.mockResolvedValueOnce({ ok: true, value: 2 });
    await captured.refresh();
    await flushPromises();
    expect(captured.count.value).toBe(2);
    expect(fetchPendingCountMock).toHaveBeenCalledTimes(2);
  });
});

describe("usePendingCount — shared state across instances", () => {
  it("複数の usePendingCount() は同じ count ref を共有する", async () => {
    fetchPendingCountMock.mockResolvedValue({ ok: true, value: 5 });
    const { usePendingCount } = await import("./usePendingCount");
    let a!: ReturnType<typeof usePendingCount>;
    let b!: ReturnType<typeof usePendingCount>;
    const HarnessA = defineComponent({
      setup() {
        a = usePendingCount();
        return () => h("div");
      },
    });
    const HarnessB = defineComponent({
      setup() {
        b = usePendingCount();
        return () => h("div");
      },
    });
    mount(HarnessA);
    mount(HarnessB);
    await flushPromises();
    expect(a.count.value).toBe(5);
    expect(b.count.value).toBe(5);
    // どちらか 1 つの refresh が両方に反映する
    fetchPendingCountMock.mockResolvedValueOnce({ ok: true, value: 9 });
    await a.refresh();
    await flushPromises();
    expect(a.count.value).toBe(9);
    expect(b.count.value).toBe(9);
  });
});

describe("usePendingCount — visibilitychange", () => {
  it("foreground 復帰 (visibilityState='visible') で再 fetch する", async () => {
    fetchPendingCountMock.mockResolvedValue({ ok: true, value: 0 });
    const { usePendingCount } = await import("./usePendingCount");
    const Harness = defineComponent({
      setup() {
        usePendingCount();
        return () => h("div");
      },
    });
    mount(Harness);
    await flushPromises();
    const initialCalls = fetchPendingCountMock.mock.calls.length;

    // visibilityState を 'visible' にして visibilitychange を発火
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await flushPromises();
    expect(fetchPendingCountMock.mock.calls.length).toBeGreaterThan(
      initialCalls,
    );
  });

  it("hidden 状態の visibilitychange では fetch しない", async () => {
    fetchPendingCountMock.mockResolvedValue({ ok: true, value: 0 });
    const { usePendingCount } = await import("./usePendingCount");
    const Harness = defineComponent({
      setup() {
        usePendingCount();
        return () => h("div");
      },
    });
    mount(Harness);
    await flushPromises();
    const initialCalls = fetchPendingCountMock.mock.calls.length;

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await flushPromises();
    expect(fetchPendingCountMock.mock.calls.length).toBe(initialCalls);
  });
});
