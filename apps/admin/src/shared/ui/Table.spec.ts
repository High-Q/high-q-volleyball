import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Table from "./Table.vue";
import TableHeader from "./TableHeader.vue";
import TableBody from "./TableBody.vue";
import TableRow from "./TableRow.vue";
import TableHead from "./TableHead.vue";
import TableCell from "./TableCell.vue";
import TableCaption from "./TableCaption.vue";

describe("Table プリミティブ群", () => {
  it("Table が <table> をレンダリングする", () => {
    const wrapper = mount(Table);
    expect(wrapper.find("table").exists()).toBe(true);
  });

  it("Table の wrapper が overflow を許容する", () => {
    const wrapper = mount(Table);
    expect(wrapper.find("div").classes()).toContain("overflow-auto");
  });

  it("class prop が wrapper に追加される", () => {
    const wrapper = mount(Table, { props: { class: "extra-class" } });
    expect(wrapper.find("div").classes()).toContain("extra-class");
  });

  it("TableHeader が <thead> をレンダリングする", () => {
    const wrapper = mount(TableHeader);
    expect(wrapper.find("thead").exists()).toBe(true);
  });

  it("TableBody が <tbody> をレンダリングする", () => {
    const wrapper = mount(TableBody);
    expect(wrapper.find("tbody").exists()).toBe(true);
  });

  it("TableRow が <tr> をレンダリングする", () => {
    const wrapper = mount(TableRow);
    expect(wrapper.find("tr").exists()).toBe(true);
  });

  it("TableHead が <th> をレンダリングする", () => {
    const wrapper = mount(TableHead);
    expect(wrapper.find("th").exists()).toBe(true);
  });

  it("TableCell が <td> をレンダリングする", () => {
    const wrapper = mount(TableCell);
    expect(wrapper.find("td").exists()).toBe(true);
  });

  it("TableCaption が <caption> をレンダリングする", () => {
    const wrapper = mount(TableCaption);
    expect(wrapper.find("caption").exists()).toBe(true);
  });

  it("slot にコンテンツを描画できる", () => {
    const wrapper = mount(TableCell, {
      slots: { default: "テストセル" },
    });
    expect(wrapper.text()).toBe("テストセル");
  });
});
