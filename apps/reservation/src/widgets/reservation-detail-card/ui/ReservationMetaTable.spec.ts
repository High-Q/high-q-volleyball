import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ReservationMetaTable from "./ReservationMetaTable.vue";

describe("ReservationMetaTable", () => {
  it("3 行 (参加費 / 同伴者 / 予約日時) を描画する", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: 1000,
        guestCount: 0,
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find('[data-testid="meta-fee"]').text()).toBe(
      "¥1,000（当日現金）",
    );
    expect(wrapper.find('[data-testid="meta-guests"]').text()).toBe("0 名");
    expect(wrapper.find('[data-testid="meta-reserved-at"]').text()).toBe(
      "2026 / 04 / 27 14:32",
    );
  });

  it("同伴者人数を反映する", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: 1000,
        guestCount: 1,
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find('[data-testid="meta-guests"]').text()).toBe("1 名");
  });

  it("fee が NULL のとき「—」を表示", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: null,
        guestCount: 0,
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find('[data-testid="meta-fee"]').text()).toBe("—");
  });

  it("経験レベル行は描画されない (#212 で撤廃)", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: 1000,
        guestCount: 0,
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find('[data-testid="meta-level"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("経験レベル");
    expect(wrapper.text()).not.toContain("初めて");
    expect(wrapper.text()).not.toContain("経験あり");
    expect(wrapper.text()).not.toContain("上級");
  });

  it("dl / dt / dd 構造を持つ (3 行)", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: 1000,
        guestCount: 0,
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find("dl").exists()).toBe(true);
    expect(wrapper.findAll("dt").length).toBe(3);
    expect(wrapper.findAll("dd").length).toBe(3);
  });
});
