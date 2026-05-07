import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ReservationMetaTable from "./ReservationMetaTable.vue";

describe("ReservationMetaTable", () => {
  it("4 行 (参加費 / 同伴者 / 経験レベル / 予約日時) を描画する", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: 1000,
        guestCount: 0,
        experienceLevel: "beginner",
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find('[data-testid="meta-fee"]').text()).toBe(
      "¥1,000（当日現金）",
    );
    expect(wrapper.find('[data-testid="meta-guests"]').text()).toBe("0 名");
    expect(wrapper.find('[data-testid="meta-level"]').text()).toBe("初めて");
    expect(wrapper.find('[data-testid="meta-reserved-at"]').text()).toBe(
      "2026 / 04 / 27 14:32",
    );
  });

  it("経験レベルが intermediate なら「経験あり」", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: 1000,
        guestCount: 1,
        experienceLevel: "intermediate",
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find('[data-testid="meta-level"]').text()).toBe("経験あり");
    expect(wrapper.find('[data-testid="meta-guests"]').text()).toBe("1 名");
  });

  it("経験レベルが experienced なら「上級」", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: 1000,
        guestCount: 0,
        experienceLevel: "experienced",
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find('[data-testid="meta-level"]').text()).toBe("上級");
  });

  it("fee が NULL のとき「—」を表示", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: null,
        guestCount: 0,
        experienceLevel: "beginner",
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find('[data-testid="meta-fee"]').text()).toBe("—");
  });

  it("dl / dt / dd 構造を持つ", () => {
    const wrapper = mount(ReservationMetaTable, {
      props: {
        fee: 1000,
        guestCount: 0,
        experienceLevel: "beginner",
        reservedAt: "2026-04-27T05:32:00Z",
      },
    });
    expect(wrapper.find("dl").exists()).toBe(true);
    expect(wrapper.findAll("dt").length).toBe(4);
    expect(wrapper.findAll("dd").length).toBe(4);
  });
});
