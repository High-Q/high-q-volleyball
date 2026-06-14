import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { ok, err } from "@high-q/shared";
import type { DashboardRecentBookingRow } from "@/entities/dashboard";

const { getRecentMock } = vi.hoisted(() => ({ getRecentMock: vi.fn() }));

vi.mock("@/entities/dashboard", () => ({
  getDashboardRecentBookings: getRecentMock,
}));

import DashboardRecentBookings from "./DashboardRecentBookings.vue";

function booking(
  i: number,
  overrides: Partial<DashboardRecentBookingRow> = {},
): DashboardRecentBookingRow {
  return {
    reservation_id: `${i}0000000-0000-4000-8000-000000000000` as DashboardRecentBookingRow["reservation_id"],
    member_id: `${i}0000000-0000-4000-8000-000000000001` as DashboardRecentBookingRow["member_id"],
    member_display_name: "田中 美咲",
    member_initial: "田",
    event_id: `${i}0000000-0000-4000-8000-000000000002` as DashboardRecentBookingRow["event_id"],
    event_name: "ゆる練 vol.42",
    created_at: "2026-06-14T11:43:00+09:00",
    status: "reserved",
    ...overrides,
  };
}

async function mountWidget() {
  const w = mount(DashboardRecentBookings);
  await flushPromises();
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardRecentBookings", () => {
  it("Loading: skeleton 表示", async () => {
    getRecentMock.mockReturnValue(new Promise(() => {}));
    const w = mount(DashboardRecentBookings);
    await nextTick();
    expect(w.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it("Success: 行を描画 (頭文字円 + 氏名 + event + time datetime)", async () => {
    getRecentMock.mockResolvedValue(ok([booking(1), booking(2)]));
    const w = await mountWidget();
    expect(w.findAll("li")).toHaveLength(2);
    expect(w.text()).toContain("田中 美咲");
    expect(w.text()).toContain("ゆる練 vol.42");
    const time = w.find("time");
    expect(time.attributes("datetime")).toBe("2026-06-14T11:43:00+09:00");
  });

  it("Empty: 『予約はまだありません』", async () => {
    getRecentMock.mockResolvedValue(ok([]));
    const w = await mountWidget();
    expect(w.text()).toContain("予約はまだありません");
  });

  it("Error: role=alert + 再試行で refetch", async () => {
    getRecentMock.mockResolvedValue(err({ code: "SERVER_ERROR", message: "x" }));
    const w = await mountWidget();
    expect(w.find('[role="alert"]').exists()).toBe(true);
    getRecentMock.mockResolvedValue(ok([booking(1)]));
    await w.find("button").trigger("click");
    await flushPromises();
    expect(getRecentMock).toHaveBeenCalledTimes(2);
  });
});
