import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BulkExportToolbar from "./BulkExportToolbar.vue";

describe("BulkExportToolbar", () => {
  it("選択件数を表示する", () => {
    const wrapper = mount(BulkExportToolbar, { props: { count: 3 } });
    expect(wrapper.text()).toContain("3 名選択中");
  });

  it("ダウンロード / 解除ボタンがイベントを emit する", async () => {
    const wrapper = mount(BulkExportToolbar, { props: { count: 2 } });
    const buttons = wrapper.findAll("button");
    // 解除 → download の順で 2 ボタン
    await buttons[0]?.trigger("click");
    await buttons[1]?.trigger("click");
    expect(wrapper.emitted("clear")).toBeTruthy();
    expect(wrapper.emitted("download")).toBeTruthy();
  });

  it("busy のときダウンロードボタンは disabled + aria-busy", () => {
    const wrapper = mount(BulkExportToolbar, {
      props: { count: 1, busy: true },
    });
    const downloadBtn = wrapper.findAll("button")[1];
    expect(downloadBtn?.attributes("aria-busy")).toBe("true");
    expect(downloadBtn?.attributes("disabled")).toBeDefined();
  });
});
