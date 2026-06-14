import { mount, flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { ok, err } from "@high-q/shared";
import type {
  DashboardNearFullEventRow,
  DashboardRecentCancellationRow,
} from "@/entities/dashboard";

const { nearFullMock, cancellationsMock } = vi.hoisted(() => ({
  nearFullMock: vi.fn(),
  cancellationsMock: vi.fn(),
}));

vi.mock("@/entities/dashboard", () => ({
  getDashboardNearFullEvents: nearFullMock,
  getDashboardRecentCancellations: cancellationsMock,
}));

import DashboardNotifications from "./DashboardNotifications.vue";

function nearFull(
  i: number,
  remaining: number,
): DashboardNearFullEventRow {
  return {
    id: `${i}0000000-0000-4000-8000-000000000000` as DashboardNearFullEventRow["id"],
    name: `ゆる練 vol.${i}`,
    start_at: "2026-06-20T19:30:00+09:00",
    capacity: 18,
    reserved_count: 18 - remaining,
    remaining,
  };
}

function cancellation(i: number): DashboardRecentCancellationRow {
  return {
    reservation_id: `${i}0000000-0000-4000-8000-000000000000` as DashboardRecentCancellationRow["reservation_id"],
    member_display_name: "木下 ゆうな",
    event_name: "ゆる練 vol.41",
    cancelled_at: "2026-06-13T12:34:00+09:00",
  };
}

async function mountWidget() {
  const w = mount(DashboardNotifications);
  await flushPromises();
  return w;
}

beforeEach(() => {
  vi.clearAllMocks();
  nearFullMock.mockResolvedValue(ok([]));
  cancellationsMock.mockResolvedValue(ok([]));
});

describe("DashboardNotifications", () => {
  it("Loading: skeleton 表示", async () => {
    nearFullMock.mockReturnValue(new Promise(() => {}));
    const w = mount(DashboardNotifications);
    await nextTick();
    expect(w.find('[aria-busy="true"]').exists()).toBe(true);
  });

  it("Empty: 合計 0 件で『いまのところ何もありません』", async () => {
    const w = await mountWidget();
    expect(w.text()).toContain("いまのところ何もありません");
  });

  it("満員直前: 残 1 = danger / 残 2 = warn", async () => {
    nearFullMock.mockResolvedValue(ok([nearFull(1, 1), nearFull(2, 2)]));
    const w = await mountWidget();
    expect(w.text()).toContain("残 1 席");
    expect(w.text()).toContain("残 2 席");
    expect(w.find(".bg-danger").exists()).toBe(true);
    expect(w.find(".bg-warn").exists()).toBe(true);
  });

  it("最近のキャンセル: 氏名 + event + time datetime", async () => {
    cancellationsMock.mockResolvedValue(ok([cancellation(1)]));
    const w = await mountWidget();
    expect(w.text()).toContain("木下 ゆうな 様（ゆる練 vol.41）");
    const time = w.find("time");
    expect(time.exists()).toBe(true);
    expect(time.attributes("datetime")).toBe("2026-06-13T12:34:00+09:00");
  });

  it("合計件数を action に表示", async () => {
    nearFullMock.mockResolvedValue(ok([nearFull(1, 1)]));
    cancellationsMock.mockResolvedValue(ok([cancellation(1), cancellation(2)]));
    const w = await mountWidget();
    expect(w.find('[aria-label="通知件数"]').text()).toContain("3 件");
  });

  it("Error: role=alert + 再試行で両 fetcher を refetch", async () => {
    nearFullMock.mockResolvedValue(err({ code: "SERVER_ERROR", message: "x" }));
    const w = await mountWidget();
    expect(w.find('[role="alert"]').exists()).toBe(true);
    nearFullMock.mockResolvedValue(ok([]));
    await w.find("button").trigger("click");
    await flushPromises();
    expect(nearFullMock).toHaveBeenCalledTimes(2);
    expect(cancellationsMock).toHaveBeenCalledTimes(2);
  });
});
