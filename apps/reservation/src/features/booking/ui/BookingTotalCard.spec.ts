import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BookingTotalCard from "./BookingTotalCard.vue";

describe("BookingTotalCard", () => {
  it("fee × (1 + guestCount) を表示する", () => {
    const w = mount(BookingTotalCard, { props: { fee: 1000, guestCount: 2 } });
    expect(w.text()).toContain("3 名 × 1,000 円");
    expect(w.text()).toContain("3,000 円");
  });

  it("guestCount=0 のとき本人のみ計算", () => {
    const w = mount(BookingTotalCard, { props: { fee: 1500, guestCount: 0 } });
    expect(w.text()).toContain("1 名 × 1,500 円");
    expect(w.text()).toContain("1,500 円");
  });

  it("fee=null のとき未定表示", () => {
    const w = mount(BookingTotalCard, { props: { fee: null, guestCount: 1 } });
    expect(w.text()).toContain("未定");
    expect(w.text()).toContain("参加費は会場側で都度決定");
  });
});
