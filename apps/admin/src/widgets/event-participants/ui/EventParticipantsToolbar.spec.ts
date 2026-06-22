import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ParticipantsFilter } from "@/features/participants-filter";

// shadcn-vue (reka-ui) プリミティブは jsdom で重いためスタブ化する。
// SelectTrigger はクラス検証のため、渡された class を透過する要素にする。
vi.mock("@/shared/ui", () => ({
  Input: { template: "<input />" },
  Select: { template: "<div><slot /></div>" },
  SelectTrigger: {
    inheritAttrs: false,
    template: '<button :class="$attrs.class"><slot /></button>',
  },
  SelectContent: { template: "<div><slot /></div>" },
  SelectItem: { template: "<div><slot /></div>" },
  SelectValue: { template: "<span><slot /></span>" },
}));

import EventParticipantsToolbar from "./EventParticipantsToolbar.vue";

const filter: ParticipantsFilter = {
  q: "",
  experience: undefined,
  checkinState: undefined,
};

let wrapper: VueWrapper | null = null;

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
});

describe("EventParticipantsToolbar - モバイル縦積み", () => {
  it("root はモバイルで縦積み (flex-col)、md 以上で横並び (md:flex-row)", () => {
    wrapper = mount(EventParticipantsToolbar, { props: { filter } });
    const root = wrapper.find("div");
    expect(root.classes()).toContain("flex-col");
    expect(root.classes()).toContain("md:flex-row");
    // モバイルで素の横並び (flex-row) を持たない（縦積みが効く）
    expect(root.classes()).not.toContain("flex-row");
  });

  it("検索ボックスはモバイル全幅 (w-full)、md 以上で固定幅 (md:w-60)", () => {
    wrapper = mount(EventParticipantsToolbar, { props: { filter } });
    expect(wrapper.html()).toContain("w-full md:w-60");
  });

  it("経験・状態フィルタのトリガーもモバイル全幅 (w-full md:w-32 / md:w-40)", () => {
    wrapper = mount(EventParticipantsToolbar, { props: { filter } });
    const html = wrapper.html();
    expect(html).toContain("w-full md:w-32");
    expect(html).toContain("w-full md:w-40");
  });
});
