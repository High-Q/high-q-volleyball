// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mountWithVuetify } from "@/test/mountWithVuetify.js";
import FooterLine from "./FooterLine.vue";

describe("FooterLine 法務リンク群", () => {
  it("プライバシーポリシー / 外部送信ポリシー / Cookie 設定 の 3 リンクが並ぶ", () => {
    const wrapper = mountWithVuetify(FooterLine);

    const privacy = wrapper.find('[data-testid="footer-privacy-link"]');
    const external = wrapper.find('[data-testid="footer-external-transmission-link"]');
    const cookie = wrapper.find('[data-testid="footer-cookie-settings"]');

    expect(privacy.exists()).toBe(true);
    expect(privacy.attributes("href")).toBe("/privacy");
    expect(privacy.text()).toContain("プライバシーポリシー");

    expect(external.exists()).toBe(true);
    expect(external.attributes("href")).toBe("/external-transmission");
    expect(external.text()).toContain("外部送信ポリシー");

    expect(cookie.exists()).toBe(true);
    expect(cookie.text()).toContain("Cookie 設定");
  });

  it("3 リンクは画面幅に依らずフッター内に常設される (text-center 法務ブロック)", () => {
    const wrapper = mountWithVuetify(FooterLine);
    const legal = wrapper.find(".footer-legal");
    expect(legal.exists()).toBe(true);
    expect(legal.findAll("a, button")).toHaveLength(3);
  });
});
