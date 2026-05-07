import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import CancelPolicyBox from "./CancelPolicyBox.vue";
import { HIGH_Q_OPEN_CHAT_URL } from "@/shared/lib/contact-channels";

describe("CancelPolicyBox", () => {
  it("CANCEL POLICY kicker と説明文を描画する", () => {
    const wrapper = mount(CancelPolicyBox);
    expect(wrapper.text()).toContain("CANCEL POLICY");
    expect(wrapper.text()).toContain("キャンセル期限は開催前日中");
  });

  it("文言には cancel_deadline 由来の「24 時間」表記とキャンセル料の言及を含まない", () => {
    const wrapper = mount(CancelPolicyBox);
    expect(wrapper.text()).not.toContain("24 時間");
    expect(wrapper.text()).not.toContain("24時間");
    expect(wrapper.text()).not.toContain("キャンセル料");
  });

  it("LINE オープンチャットへの外部リンクを target=\"_blank\" で開く", () => {
    const wrapper = mount(CancelPolicyBox);
    const link = wrapper.find("a");
    expect(link.attributes("href")).toBe(HIGH_Q_OPEN_CHAT_URL);
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
  });

  it("LINE リンクは控えめな装飾 (下線なし・カギ括弧なし) で描画される (#215)", () => {
    const wrapper = mount(CancelPolicyBox);
    const link = wrapper.find("a");
    // 下線クラスは持たない
    expect(link.classes()).not.toContain("underline");
    expect(link.classes()).not.toContain("underline-offset-2");
    // カギ括弧でリンクテキストを囲んでいない
    expect(link.text()).not.toMatch(/^「.*」$/);
  });
});
