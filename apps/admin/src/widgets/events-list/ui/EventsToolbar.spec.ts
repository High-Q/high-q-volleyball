import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EventsToolbar from "./EventsToolbar.vue";
import { DEFAULT_FILTER, type FilterState } from "@/features/events-filter";
import type { VenueId } from "@high-q/shared";

const venues: ReadonlyArray<{ id: VenueId; name: string }> = [
  { id: "11111111-1111-4111-8111-111111111111" as VenueId, name: "亀戸スポーツセンター" },
  { id: "22222222-2222-4222-8222-222222222222" as VenueId, name: "東砂スポーツセンター" },
];

describe("EventsToolbar", () => {
  it("検索 input / 「新規作成」ボタンが表示される", () => {
    const wrapper = mount(EventsToolbar, {
      props: { filter: DEFAULT_FILTER as FilterState, venues },
    });
    expect(wrapper.find('input[type="search"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("新規作成");
  });

  it("検索 input への入力で update:search emit", async () => {
    const wrapper = mount(EventsToolbar, {
      props: { filter: DEFAULT_FILTER as FilterState, venues },
    });
    await wrapper.find('input[type="search"]').setValue("ゆる練");
    const events = wrapper.emitted("update:search");
    expect(events).toBeDefined();
    expect(events?.[events.length - 1]).toEqual(["ゆる練"]);
  });

  it("「新規作成」ボタン押下で clickNew emit", async () => {
    const wrapper = mount(EventsToolbar, {
      props: { filter: DEFAULT_FILTER as FilterState, venues },
    });
    const buttons = wrapper.findAll("button");
    const newBtn = buttons.find((b) => b.text().includes("新規作成"));
    expect(newBtn).toBeDefined();
    await newBtn!.trigger("click");
    expect(wrapper.emitted("clickNew")).toBeDefined();
  });

  it("検索 input の v-model が反映される（filter.search → input value）", () => {
    const wrapper = mount(EventsToolbar, {
      props: {
        filter: { ...DEFAULT_FILTER, search: "練習" } as FilterState,
        venues,
      },
    });
    const input = wrapper.find('input[type="search"]')
      .element as HTMLInputElement;
    expect(input.value).toBe("練習");
  });

  it("aria-label が各 Select trigger に付与される", () => {
    const wrapper = mount(EventsToolbar, {
      props: { filter: DEFAULT_FILTER as FilterState, venues },
    });
    const triggers = wrapper.findAll('[role="combobox"]');
    const labels = triggers.map((t) => t.attributes("aria-label"));
    expect(labels).toContain("期間フィルタ");
    expect(labels).toContain("会場フィルタ");
    expect(labels).toContain("ステータスフィルタ");
  });
});
