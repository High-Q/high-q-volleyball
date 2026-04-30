import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EventsPagination from "./EventsPagination.vue";

describe("EventsPagination", () => {
  it("総件数とページ数が表示される", () => {
    const wrapper = mount(EventsPagination, {
      props: { page: 1, total: 62, per: 25 },
    });
    expect(wrapper.text()).toContain("62 件");
    expect(wrapper.text()).toContain("1 / 3 ページ");
  });

  it("page=1 で前へが disabled", () => {
    const wrapper = mount(EventsPagination, {
      props: { page: 1, total: 62, per: 25 },
    });
    const prev = wrapper
      .findAll("button")
      .find((b) => b.text() === "前へ");
    expect(prev?.attributes("disabled")).toBeDefined();
  });

  it("最終ページで次へが disabled", () => {
    const wrapper = mount(EventsPagination, {
      props: { page: 3, total: 62, per: 25 },
    });
    const next = wrapper
      .findAll("button")
      .find((b) => b.text() === "次へ");
    expect(next?.attributes("disabled")).toBeDefined();
  });

  it("ページ番号押下で update:page emit", async () => {
    const wrapper = mount(EventsPagination, {
      props: { page: 1, total: 62, per: 25 },
    });
    const btn = wrapper.findAll("button").find((b) => b.text() === "2");
    expect(btn).toBeDefined();
    await btn!.trigger("click");
    const events = wrapper.emitted("update:page");
    expect(events?.[0]).toEqual([2]);
  });

  it("aria-current='page' が現在ページに付与される", () => {
    const wrapper = mount(EventsPagination, {
      props: { page: 2, total: 62, per: 25 },
    });
    const current = wrapper
      .findAll("button")
      .find((b) => b.attributes("aria-current") === "page");
    expect(current?.text()).toBe("2");
  });

  it("total=0 でも 1 / 1 ページが表示される（割り算で 0 にならない）", () => {
    const wrapper = mount(EventsPagination, {
      props: { page: 1, total: 0, per: 25 },
    });
    expect(wrapper.text()).toContain("1 / 1 ページ");
  });
});
