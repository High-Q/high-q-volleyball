import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

const { useDashboardStatsMock, refetchMock } = vi.hoisted(() => ({
  useDashboardStatsMock: vi.fn(),
  refetchMock: vi.fn(),
}));

vi.mock("@/features/dashboard-stats", () => ({
  useDashboardStats: useDashboardStatsMock,
}));

import DashboardStatCards from "./DashboardStatCards.vue";

function setup(state: {
  vms?: unknown[];
  loading?: boolean;
  error?: { code: string } | null;
}) {
  useDashboardStatsMock.mockReturnValue({
    vms: ref(state.vms ?? []),
    loading: ref(state.loading ?? false),
    error: ref(state.error ?? null),
    refetch: refetchMock,
  });
}

const sampleVms = [
  { kicker: "01", label: "今後のイベント", value: 6, unit: "件", deltaTone: "flat", accent: true },
  { kicker: "02", label: "累計参加者 (今月)", value: 184, unit: "名", delta: "+7%", deltaTone: "up" },
  { kicker: "03", label: "今月の参加費合計", value: "¥84,500", delta: "+18%", deltaTone: "up" },
  { kicker: "04", label: "平均充足率", value: "87", unit: "%", deltaTone: "flat" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DashboardStatCards", () => {
  it("Loading: skeleton を 4 枚描画 (StatCard は出さない)", () => {
    setup({ loading: true });
    const w = mount(DashboardStatCards);
    expect(w.find('[aria-busy="true"]').exists()).toBe(true);
    expect(w.findAllComponents({ name: "StatCard" })).toHaveLength(0);
  });

  it("Error: role=alert + 再試行で refetch", async () => {
    setup({ error: { code: "SERVER_ERROR" } });
    const w = mount(DashboardStatCards);
    const alert = w.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("admin_dashboard_view");
    await w.find("button").trigger("click");
    expect(refetchMock).toHaveBeenCalledOnce();
  });

  it("Success: StatCard 4 枚を描画", () => {
    setup({ vms: sampleVms });
    const w = mount(DashboardStatCards);
    expect(w.findAllComponents({ name: "StatCard" })).toHaveLength(4);
    expect(w.text()).toContain("今後のイベント");
    expect(w.text()).toContain("¥84,500");
  });
});
