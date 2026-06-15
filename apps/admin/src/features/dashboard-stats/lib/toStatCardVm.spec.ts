import { describe, expect, it } from "vitest";
import type { DashboardStatsRow } from "@/entities/dashboard";
import {
  formatCurrencyYen,
  formatDelta,
  formatPercent,
  toStatCardVms,
} from "./toStatCardVm";

const BASE: DashboardStatsRow = {
  upcoming_event_count: 6,
  upcoming_full_event_count: 2,
  attended_this_month_count: 184,
  attended_last_month_count: 172,
  attended_delta_pct_vs_last_month: 0.07,
  fee_total_this_month: 84500,
  fee_total_last_month: 71500,
  fee_delta_pct_vs_last_month: 0.18,
  avg_fill_rate_6m: 0.87,
};

describe("formatDelta", () => {
  it("正の小数 は +X% / up", () => {
    expect(formatDelta(0.2)).toEqual({ delta: "+20%", tone: "up" });
  });
  it("負の小数 は -X% / down", () => {
    expect(formatDelta(-0.03)).toEqual({ delta: "-3%", tone: "down" });
  });
  it("0 は 0% / flat", () => {
    expect(formatDelta(0)).toEqual({ delta: "0%", tone: "flat" });
  });
  it("NULL は — % / flat", () => {
    expect(formatDelta(null)).toEqual({ delta: "— %", tone: "flat" });
  });
});

describe("formatCurrencyYen", () => {
  it.each([
    [0, "¥0"],
    [100, "¥100"],
    [1500, "¥1,500"],
    [84500, "¥84,500"],
    [1234567, "¥1,234,567"],
  ])("%i → %s", (n, s) => {
    expect(formatCurrencyYen(n)).toBe(s);
  });
});

describe("formatPercent", () => {
  it("0.87 → 87", () => expect(formatPercent(0.87)).toBe("87"));
  it("0.5  → 50", () => expect(formatPercent(0.5)).toBe("50"));
  it("0    → 0", () => expect(formatPercent(0)).toBe("0"));
  it("NULL → —", () => expect(formatPercent(null)).toBe("—"));
});

describe("toStatCardVms", () => {
  it("4 枚分の VM を返す", () => {
    const vms = toStatCardVms(BASE);
    expect(vms).toHaveLength(4);
    expect(vms.map((v) => v.kicker)).toEqual(["01", "02", "03", "04"]);
  });

  it("今後のイベント: 値 + 満員サブラベル", () => {
    const [card01] = toStatCardVms(BASE);
    expect(card01?.label).toBe("今後のイベント");
    expect(card01?.value).toBe(6);
    expect(card01?.unit).toBe("件");
    expect(card01?.sub).toBe("2 件は満員");
    expect(card01?.accent).toBe(true);
  });

  it("満員 0 件のときサブラベル無し", () => {
    const vms = toStatCardVms({ ...BASE, upcoming_full_event_count: 0 });
    expect(vms[0]?.sub).toBeUndefined();
  });

  it("累計参加者: delta tone up + 整数%", () => {
    const [, card02] = toStatCardVms(BASE);
    expect(card02?.value).toBe(184);
    expect(card02?.delta).toBe("+7%");
    expect(card02?.deltaTone).toBe("up");
  });

  it("参加費合計: 円書式", () => {
    const [, , card03] = toStatCardVms(BASE);
    expect(card03?.value).toBe("¥84,500");
    expect(card03?.delta).toBe("+18%");
    expect(card03?.deltaTone).toBe("up");
  });

  it("平均充足率: 87 / unit=%", () => {
    const [, , , card04] = toStatCardVms(BASE);
    expect(card04?.value).toBe("87");
    expect(card04?.unit).toBe("%");
  });

  it("平均充足率 NULL は — / unit 無し", () => {
    const vms = toStatCardVms({ ...BASE, avg_fill_rate_6m: null });
    expect(vms[3]?.value).toBe("—");
    expect(vms[3]?.unit).toBeUndefined();
  });

  it("attended_delta NULL は — % + flat tone", () => {
    const vms = toStatCardVms({
      ...BASE,
      attended_delta_pct_vs_last_month: null,
    });
    expect(vms[1]?.delta).toBe("— %");
    expect(vms[1]?.deltaTone).toBe("flat");
  });
});
