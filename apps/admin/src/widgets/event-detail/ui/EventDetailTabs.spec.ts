import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EventDetailTabs from "./EventDetailTabs.vue";

const ITEMS = [
  { id: "participants" as const, label: "参加者一覧", count: 16 },
  {
    id: "wait" as const,
    label: "キャンセル待ち",
    count: 0,
    disabled: true,
    comingSoon: "Coming soon",
  },
  {
    id: "checkin" as const,
    label: "当日チェックイン",
    disabled: true,
    comingSoon: "Coming soon",
  },
];

describe("EventDetailTabs — 描画", () => {
  it("3 タブが描画される", () => {
    const w = mount(EventDetailTabs, {
      props: { active: "participants", items: ITEMS },
    });
    expect(w.findAll('[role="tab"]')).toHaveLength(3);
  });

  it("active タブに aria-selected=true、それ以外は false", () => {
    const w = mount(EventDetailTabs, {
      props: { active: "participants", items: ITEMS },
    });
    const tabs = w.findAll('[role="tab"]');
    expect(tabs[0]!.attributes("aria-selected")).toBe("true");
    expect(tabs[1]!.attributes("aria-selected")).toBe("false");
    expect(tabs[2]!.attributes("aria-selected")).toBe("false");
  });

  it("disabled タブに aria-disabled=true + tabindex=-1", () => {
    const w = mount(EventDetailTabs, {
      props: { active: "participants", items: ITEMS },
    });
    const tabs = w.findAll('[role="tab"]');
    expect(tabs[1]!.attributes("aria-disabled")).toBe("true");
    expect(tabs[1]!.attributes("tabindex")).toBe("-1");
    expect(tabs[2]!.attributes("aria-disabled")).toBe("true");
  });

  it("active タブに tabindex=0", () => {
    const w = mount(EventDetailTabs, {
      props: { active: "participants", items: ITEMS },
    });
    const tabs = w.findAll('[role="tab"]');
    expect(tabs[0]!.attributes("tabindex")).toBe("0");
  });

  it("disabled タブの title 属性に Coming soon が入る", () => {
    const w = mount(EventDetailTabs, {
      props: { active: "participants", items: ITEMS },
    });
    const tabs = w.findAll('[role="tab"]');
    expect(tabs[1]!.attributes("title")).toBe("Coming soon");
    expect(tabs[2]!.attributes("title")).toBe("Coming soon");
    expect(tabs[0]!.attributes("title")).toBeUndefined();
  });

  it("count 数値が併記される", () => {
    const w = mount(EventDetailTabs, {
      props: { active: "participants", items: ITEMS },
    });
    const tabs = w.findAll('[role="tab"]');
    expect(tabs[0]!.text()).toContain("16");
  });
});

describe("EventDetailTabs — クリック挙動", () => {
  it("active タブクリックで change イベント発火（既に active でも emit）", async () => {
    const w = mount(EventDetailTabs, {
      props: { active: "participants", items: ITEMS },
    });
    await w.findAll('[role="tab"]')[0]!.trigger("click");
    expect(w.emitted("change")).toBeTruthy();
  });

  it("disabled タブクリックで change イベント発火しない", async () => {
    const w = mount(EventDetailTabs, {
      props: { active: "participants", items: ITEMS },
    });
    await w.findAll('[role="tab"]')[1]!.trigger("click");
    expect(w.emitted("change")).toBeFalsy();
  });

  it("role='tablist' でラップされる", () => {
    const w = mount(EventDetailTabs, {
      props: { active: "participants", items: ITEMS },
    });
    expect(w.find('[role="tablist"]').exists()).toBe(true);
  });
});
