import { describe, expect, it, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

const state = {
  nextEvent: ref<unknown>(null),
  isPending: ref(false),
  isError: ref(false),
  isEmpty: ref(false),
};

vi.mock("../model/useNextSession", () => ({
  useNextSession: () => state,
}));

import NextSessionStrip from "../ui/NextSessionStrip.vue";

// ローカル時刻で構築し TZ 非依存に (getMonth/getDate/getHours が指定値を返す)
function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt-1",
    name: "ゆる練",
    start: new Date(2026, 4, 14, 18, 0), // 5/14 18:00
    end: new Date(2026, 4, 14, 20, 0), // 20:00
    location: "江東区スポーツ会館",
    vol: 21,
    ...overrides,
  };
}

beforeEach(() => {
  state.nextEvent.value = null;
  state.isPending.value = false;
  state.isError.value = false;
  state.isEmpty.value = false;
});

describe("NextSessionStrip", () => {
  it("日付 (M/D + 英略曜日) を表示する", () => {
    state.nextEvent.value = makeEvent();
    const wrapper = mount(NextSessionStrip);
    const date = wrapper.find('[data-testid="next-session-date"]');
    expect(date.exists()).toBe(true);
    expect(date.text()).toContain("5/14");
    expect(date.find(".next-strip__dow").text()).toMatch(/^[A-Z]{3}$/);
  });

  it("シリーズ名と号数 vol.NN バッジを表示する", () => {
    state.nextEvent.value = makeEvent({ vol: 21 });
    const wrapper = mount(NextSessionStrip);
    expect(
      wrapper.find('[data-testid="next-session-series"]').text(),
    ).toBe("ゆる練");
    const vol = wrapper.find('[data-testid="next-session-vol"]');
    expect(vol.exists()).toBe(true);
    expect(vol.text()).toBe("vol.21");
  });

  it("時間 · 会場のメタを表示する", () => {
    state.nextEvent.value = makeEvent();
    const wrapper = mount(NextSessionStrip);
    expect(wrapper.find('[data-testid="next-session-meta"]').text()).toBe(
      "18:00–20:00 · 江東区スポーツ会館",
    );
  });

  it("特別回 (vol=null) では号数を出さずシリーズ名を見せる", () => {
    state.nextEvent.value = makeEvent({ name: "BBQ", vol: null });
    const wrapper = mount(NextSessionStrip);
    expect(
      wrapper.find('[data-testid="next-session-vol"]').exists(),
    ).toBe(false);
    expect(
      wrapper.find('[data-testid="next-session-series"]').text(),
    ).toBe("BBQ");
  });

  it("予約リンクが予約先 URL を指す", () => {
    state.nextEvent.value = makeEvent({ id: "evt-xyz" });
    const wrapper = mount(NextSessionStrip);
    const cta = wrapper.find('[data-testid="next-session-cta"]');
    expect(cta.exists()).toBe(true);
    expect(cta.attributes("href")).toContain("evt-xyz");
  });

  it("nextEvent が無いときは予約リンクを出さない", () => {
    state.nextEvent.value = null;
    const wrapper = mount(NextSessionStrip);
    expect(
      wrapper.find('[data-testid="next-session-cta"]').exists(),
    ).toBe(false);
  });
});
