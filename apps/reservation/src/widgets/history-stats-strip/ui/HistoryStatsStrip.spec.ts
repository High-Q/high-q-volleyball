import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import HistoryStatsStrip from "./HistoryStatsStrip.vue";

describe("HistoryStatsStrip", () => {
  it("props で受けた値を 3 列に表示する", () => {
    const wrapper = mount(HistoryStatsStrip, {
      props: {
        stats: { attendedCount: 7, daysToNext: 8, streakMonths: 3 },
      },
    });
    expect(wrapper.get('[data-testid="history-stats-total"]').text()).toBe("7");
    expect(wrapper.get('[data-testid="history-stats-next"]').text()).toBe("8");
    expect(wrapper.get('[data-testid="history-stats-streak"]').text()).toBe("3");
    expect(wrapper.text()).toContain("回 参加");
    expect(wrapper.text()).toContain("日後");
    expect(wrapper.text()).toContain("ヶ月連続");
  });

  it("daysToNext が null のとき NEXT に — を表示する", () => {
    const wrapper = mount(HistoryStatsStrip, {
      props: {
        stats: { attendedCount: 0, daysToNext: null, streakMonths: 0 },
      },
    });
    expect(wrapper.get('[data-testid="history-stats-next"]').text()).toBe("—");
    expect(wrapper.get('[data-testid="history-stats-total"]').text()).toBe("0");
    expect(wrapper.get('[data-testid="history-stats-streak"]').text()).toBe("0");
  });

  it("3 列グリッドのセマンティックは <dl>/<dt>/<dd>", () => {
    const wrapper = mount(HistoryStatsStrip, {
      props: {
        stats: { attendedCount: 1, daysToNext: 2, streakMonths: 3 },
      },
    });
    expect(wrapper.find("dl").exists()).toBe(true);
    expect(wrapper.findAll("dt")).toHaveLength(3);
    expect(wrapper.findAll("dd")).toHaveLength(3);
  });
});
