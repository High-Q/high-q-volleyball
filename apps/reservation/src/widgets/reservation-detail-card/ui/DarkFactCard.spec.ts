import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import DarkFactCard from "./DarkFactCard.vue";

describe("DarkFactCard", () => {
  it("カウントダウン / 開催日 / 曜日 / 時間 / 会場名を描画する", () => {
    const wrapper = mount(DarkFactCard, {
      props: {
        startAt: "2026-05-15T10:30:00Z",
        endAt: "2026-05-15T12:30:00Z",
        venueName: "亀戸スポーツセンター",
        now: new Date("2026-05-07T00:00:00Z"),
      },
    });
    expect(wrapper.find('[data-testid="countdown-label"]').text()).toBe("— あと 8 日");
    expect(wrapper.find('[data-testid="month-day"]').text()).toBe("05 / 15");
    expect(wrapper.find('[data-testid="weekday-label"]').text()).toBe("FRI");
    expect(wrapper.find('[data-testid="time-range"]').text()).toBe("19:30 – 21:30");
    expect(wrapper.find('[data-testid="venue-name"]').text()).toBe("亀戸スポーツセンター");
  });

  it("開催当日は「— 当日」を描画する", () => {
    const wrapper = mount(DarkFactCard, {
      props: {
        startAt: "2026-05-07T12:00:00Z",
        endAt: "2026-05-07T14:00:00Z",
        venueName: "板橋区立体育館",
        now: new Date("2026-05-07T00:00:00Z"),
      },
    });
    expect(wrapper.find('[data-testid="countdown-label"]').text()).toBe("— 当日");
  });

  it("開催開始以降は「— 開催終了」を描画する", () => {
    const wrapper = mount(DarkFactCard, {
      props: {
        startAt: "2026-04-01T10:00:00Z",
        endAt: "2026-04-01T12:00:00Z",
        venueName: "板橋区立体育館",
        now: new Date("2026-05-07T00:00:00Z"),
      },
    });
    expect(wrapper.find('[data-testid="countdown-label"]').text()).toBe(
      "— 開催終了",
    );
  });

  it("8 日以上先のカウントダウンは accent 色を使わず muted (opacity-60) で描画される (#215)", () => {
    const wrapper = mount(DarkFactCard, {
      props: {
        startAt: "2026-05-15T10:30:00Z", // 8 日後
        endAt: "2026-05-15T12:30:00Z",
        venueName: "板橋区立体育館",
        now: new Date("2026-05-07T00:00:00Z"),
      },
    });
    const cd = wrapper.find('[data-testid="countdown-label"]');
    expect(cd.classes()).not.toContain("text-accent");
    expect(cd.classes()).toContain("opacity-60");
  });

  it("7 日以内のカウントダウンは accent 色で描画される (#215)", () => {
    const wrapper = mount(DarkFactCard, {
      props: {
        startAt: "2026-05-12T10:30:00Z", // 5 日後
        endAt: "2026-05-12T12:30:00Z",
        venueName: "板橋区立体育館",
        now: new Date("2026-05-07T00:00:00Z"),
      },
    });
    const cd = wrapper.find('[data-testid="countdown-label"]');
    expect(cd.classes()).toContain("text-accent");
  });

  it("当日は accent 色で描画される (#215)", () => {
    const wrapper = mount(DarkFactCard, {
      props: {
        startAt: "2026-05-07T12:00:00Z",
        endAt: "2026-05-07T14:00:00Z",
        venueName: "板橋区立体育館",
        now: new Date("2026-05-07T00:00:00Z"),
      },
    });
    const cd = wrapper.find('[data-testid="countdown-label"]');
    expect(cd.classes()).toContain("text-accent");
  });
});
