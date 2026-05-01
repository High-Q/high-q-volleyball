import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import CheckinToggle from "./CheckinToggle.vue";

describe("CheckinToggle — 描画", () => {
  it("checked=false で「未」テキスト + aria-checked=false", () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "田中 美咲" },
    });
    expect(w.attributes("aria-checked")).toBe("false");
    expect(w.find("[data-testid='checkin-label']").text()).toBe("未");
  });

  it("checked=true で「済」テキスト + aria-checked=true", () => {
    const w = mount(CheckinToggle, {
      props: { checked: true, memberName: "佐藤 健太" },
    });
    expect(w.attributes("aria-checked")).toBe("true");
    expect(w.find("[data-testid='checkin-label']").text()).toBe("済");
  });

  it("role=switch + tabindex=0 を持つ", () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x" },
    });
    expect(w.attributes("role")).toBe("switch");
    expect(w.attributes("tabindex")).toBe("0");
  });

  it("aria-label に member 名を含む", () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "中村 あかり" },
    });
    expect(w.attributes("aria-label")).toBe("中村 あかり のチェックイン");
  });
});

describe("CheckinToggle — クリック", () => {
  it("クリックで toggle event を発火", async () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x" },
    });
    await w.trigger("click");
    expect(w.emitted("toggle")).toHaveLength(1);
  });

  it("inFlight=true ではクリックしても toggle を発火しない", async () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x", inFlight: true },
    });
    await w.trigger("click");
    expect(w.emitted("toggle")).toBeUndefined();
  });
});

describe("CheckinToggle — キーボード", () => {
  it("Space キーで toggle event を発火", async () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x" },
    });
    await w.trigger("keydown", { key: " " });
    expect(w.emitted("toggle")).toHaveLength(1);
  });

  it("Enter キーで toggle event を発火", async () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x" },
    });
    await w.trigger("keydown", { key: "Enter" });
    expect(w.emitted("toggle")).toHaveLength(1);
  });

  it("Tab / 他キーでは発火しない", async () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x" },
    });
    await w.trigger("keydown", { key: "Tab" });
    await w.trigger("keydown", { key: "a" });
    expect(w.emitted("toggle")).toBeUndefined();
  });

  it("inFlight=true では Space / Enter でも発火しない", async () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x", inFlight: true },
    });
    await w.trigger("keydown", { key: " " });
    await w.trigger("keydown", { key: "Enter" });
    expect(w.emitted("toggle")).toBeUndefined();
  });
});

describe("CheckinToggle — in-flight aria 属性", () => {
  it("inFlight=true で aria-busy=true + aria-disabled=true", () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x", inFlight: true },
    });
    expect(w.attributes("aria-busy")).toBe("true");
    expect(w.attributes("aria-disabled")).toBe("true");
  });

  it("inFlight=false で aria-busy=false + aria-disabled=false", () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x", inFlight: false },
    });
    expect(w.attributes("aria-busy")).toBe("false");
    expect(w.attributes("aria-disabled")).toBe("false");
  });
});

describe("CheckinToggle — checked 切替の reactivity", () => {
  it("props 変更で aria-checked と表示テキストが追従", async () => {
    const w = mount(CheckinToggle, {
      props: { checked: false, memberName: "x" },
    });
    await w.setProps({ checked: true });
    expect(w.attributes("aria-checked")).toBe("true");
    expect(w.find("[data-testid='checkin-label']").text()).toBe("済");
  });
});
