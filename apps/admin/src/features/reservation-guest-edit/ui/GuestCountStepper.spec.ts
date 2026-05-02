import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import GuestCountStepper from "./GuestCountStepper.vue";

describe("GuestCountStepper — 描画", () => {
  it("count=0 で「–」表示 + − ボタン disabled", () => {
    const w = mount(GuestCountStepper, {
      props: { count: 0, memberName: "田中" },
    });
    const value = w.find("[data-testid='guest-count-value']");
    expect(value.text()).toBe("–");
    const decBtn = w.findAll("button")[0];
    expect(decBtn!.attributes("disabled")).toBeDefined();
  });

  it("count=1 で「+1」表示 + 両ボタン有効", () => {
    const w = mount(GuestCountStepper, {
      props: { count: 1, memberName: "田中" },
    });
    expect(w.find("[data-testid='guest-count-value']").text()).toBe("+1");
    const buttons = w.findAll("button");
    expect(buttons[0]!.attributes("disabled")).toBeUndefined();
    expect(buttons[1]!.attributes("disabled")).toBeUndefined();
  });

  it("count=5 で + ボタン disabled (DB CHECK 制約 0..5)", () => {
    const w = mount(GuestCountStepper, {
      props: { count: 5, memberName: "田中" },
    });
    expect(w.find("[data-testid='guest-count-value']").text()).toBe("+5");
    const incBtn = w.findAll("button")[1];
    expect(incBtn!.attributes("disabled")).toBeDefined();
  });

  it("aria-label に member 名を含む", () => {
    const w = mount(GuestCountStepper, {
      props: { count: 2, memberName: "佐藤 健太" },
    });
    expect(w.attributes("aria-label")).toBe("佐藤 健太 の同伴者数 2 名");
    const buttons = w.findAll("button");
    expect(buttons[0]!.attributes("aria-label")).toContain("減らす");
    expect(buttons[1]!.attributes("aria-label")).toContain("増やす");
  });
});

describe("GuestCountStepper — 操作", () => {
  it("+ クリックで change event (count+1) を発火", async () => {
    const w = mount(GuestCountStepper, {
      props: { count: 1, memberName: "x" },
    });
    await w.findAll("button")[1]!.trigger("click");
    expect(w.emitted("change")?.[0]).toEqual([2]);
  });

  it("− クリックで change event (count-1) を発火", async () => {
    const w = mount(GuestCountStepper, {
      props: { count: 2, memberName: "x" },
    });
    await w.findAll("button")[0]!.trigger("click");
    expect(w.emitted("change")?.[0]).toEqual([1]);
  });

  it("count=0 で − クリックしても発火しない", async () => {
    const w = mount(GuestCountStepper, {
      props: { count: 0, memberName: "x" },
    });
    await w.findAll("button")[0]!.trigger("click");
    expect(w.emitted("change")).toBeUndefined();
  });

  it("count=5 で + クリックしても発火しない", async () => {
    const w = mount(GuestCountStepper, {
      props: { count: 5, memberName: "x" },
    });
    await w.findAll("button")[1]!.trigger("click");
    expect(w.emitted("change")).toBeUndefined();
  });

  it("inFlight=true で両ボタン disabled + aria-busy=true", async () => {
    const w = mount(GuestCountStepper, {
      props: { count: 2, memberName: "x", inFlight: true },
    });
    expect(w.attributes("aria-busy")).toBe("true");
    const buttons = w.findAll("button");
    expect(buttons[0]!.attributes("disabled")).toBeDefined();
    expect(buttons[1]!.attributes("disabled")).toBeDefined();
    await buttons[1]!.trigger("click");
    expect(w.emitted("change")).toBeUndefined();
  });
});
