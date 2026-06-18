import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { effectScope, ref, type EffectScope } from "vue";

const fetchMock = vi.fn();
// memberRef はテストごとに作り直し、前テストの watcher が反応しないよう隔離する。
let memberRef = ref<{ id: string } | null>(null);

vi.mock("@/entities/reservation", () => ({
  fetchMyEventReservation: (...args: unknown[]) => fetchMock(...args),
}));

vi.mock("@/features/auth", () => ({
  useAuthSession: () => ({ member: memberRef }),
}));

// composable の watch を effectScope 内で生成し、各テスト後に stop して残留を防ぐ。
let scope: EffectScope | null = null;
function inScope<T>(fn: () => T): T {
  scope = effectScope();
  return scope.run(fn) as T;
}

beforeEach(() => {
  vi.clearAllMocks();
  memberRef = ref<{ id: string } | null>(null);
  fetchMock.mockResolvedValue(null);
});

afterEach(() => {
  scope?.stop();
  scope = null;
  vi.restoreAllMocks();
});

describe("useMyEventReservation", () => {
  it("member 未確定の間は fetch せず resolved=false", async () => {
    const { useMyEventReservation } = await import("./useMyEventReservation");
    const c = inScope(() => useMyEventReservation(ref("ev-1")));
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(c.resolved.value).toBe(false);
    expect(c.myReservation.value).toBeNull();
  });

  it("member + eventId 揃い、取得成功で myReservation を確定する", async () => {
    memberRef.value = { id: "mb-1" };
    fetchMock.mockResolvedValueOnce({
      id: "rs-1",
      status: "waitlist",
      guestCount: 1,
      note: "",
    });
    const { useMyEventReservation } = await import("./useMyEventReservation");
    const c = inScope(() => useMyEventReservation(ref("ev-1")));
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("ev-1", "mb-1");
    expect(c.resolved.value).toBe(true);
    expect(c.myReservation.value?.status).toBe("waitlist");
  });

  it("取得失敗時は安全側: myReservation=null かつ resolved=false", async () => {
    memberRef.value = { id: "mb-1" };
    fetchMock.mockRejectedValueOnce(new Error("boom"));
    const { useMyEventReservation } = await import("./useMyEventReservation");
    const c = inScope(() => useMyEventReservation(ref("ev-1")));
    await flushPromises();

    expect(c.myReservation.value).toBeNull();
    expect(c.resolved.value).toBe(false);
  });

  it("member が後から確定したら fetch して状態を更新する (watch 反応)", async () => {
    fetchMock.mockResolvedValueOnce({
      id: "rs-2",
      status: "reserved",
      guestCount: 0,
      note: "",
    });
    const { useMyEventReservation } = await import("./useMyEventReservation");
    const c = inScope(() => useMyEventReservation(ref("ev-1")));
    await flushPromises();
    expect(fetchMock).not.toHaveBeenCalled();

    memberRef.value = { id: "mb-1" };
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("ev-1", "mb-1");
    expect(c.myReservation.value?.status).toBe("reserved");
  });

  it("setLocal で楽観的に値を確定できる", async () => {
    const { useMyEventReservation } = await import("./useMyEventReservation");
    const c = inScope(() => useMyEventReservation(ref("ev-1")));
    await flushPromises();

    c.setLocal({ id: "rs-9", status: "waitlist", guestCount: 0, note: "" });
    expect(c.resolved.value).toBe(true);
    expect(c.myReservation.value?.id).toBe("rs-9");
  });
});
