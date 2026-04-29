import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const ADD_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

describe("useIdleTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("start() で 4 種類の event listener を document に登録する", async () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const { useIdleTimeout } = await import("./useIdleTimeout");

    const t = useIdleTimeout();
    t.start(() => {});

    for (const ev of ADD_EVENTS) {
      expect(addSpy).toHaveBeenCalledWith(ev, expect.any(Function), {
        passive: true,
      });
    }
    t.stop();
  });

  it("15 分 (900_000ms) 経過で onIdle が呼ばれる", async () => {
    const onIdle = vi.fn();
    const { useIdleTimeout } = await import("./useIdleTimeout");
    const t = useIdleTimeout();
    t.start(onIdle);

    vi.advanceTimersByTime(900_000 - 1);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    expect(onIdle).toHaveBeenCalledTimes(1);

    t.stop();
  });

  it("いずれかのイベントでタイマーがリセットされる", async () => {
    const onIdle = vi.fn();
    const { useIdleTimeout } = await import("./useIdleTimeout");
    const t = useIdleTimeout();
    t.start(onIdle);

    vi.advanceTimersByTime(800_000);
    document.dispatchEvent(new Event("mousedown"));
    vi.advanceTimersByTime(800_000); // ここまでで合計 1_600_000ms だがリセットされたので idle にはなっていない
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200_000);
    expect(onIdle).toHaveBeenCalledTimes(1);

    t.stop();
  });

  it("stop() で listener と timer がクリアされる", async () => {
    const onIdle = vi.fn();
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { useIdleTimeout } = await import("./useIdleTimeout");
    const t = useIdleTimeout();
    t.start(onIdle);
    t.stop();

    for (const ev of ADD_EVENTS) {
      expect(removeSpy).toHaveBeenCalledWith(ev, expect.any(Function));
    }

    vi.advanceTimersByTime(2_000_000);
    expect(onIdle).not.toHaveBeenCalled();
  });

  it("二重 start でも timer は 1 つだけ動く", async () => {
    const onIdle = vi.fn();
    const { useIdleTimeout } = await import("./useIdleTimeout");
    const t = useIdleTimeout();
    t.start(onIdle);
    t.start(onIdle);

    vi.advanceTimersByTime(900_001);
    expect(onIdle).toHaveBeenCalledTimes(1);

    t.stop();
  });
});
