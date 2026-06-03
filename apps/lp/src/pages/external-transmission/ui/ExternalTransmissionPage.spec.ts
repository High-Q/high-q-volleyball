// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { useConsentPanel } from "@shared/lib/consentPanel";
import ExternalTransmissionPage from "./ExternalTransmissionPage.vue";

describe("ExternalTransmissionPage", () => {
  it("外部送信先テーブルに 5 行（必須 4 + 任意 1）が描画される", () => {
    const wrapper = mount(ExternalTransmissionPage);
    const table = wrapper.find('[data-testid="external-transmission-table"]');
    expect(table.exists()).toBe(true);
    const rows = table.findAll("tbody tr");
    expect(rows).toHaveLength(5);
  });

  it("テーブルが GTM/GA・Google Fonts・Supabase・Render・AWS API Gateway の 5 送信先を含む", () => {
    const wrapper = mount(ExternalTransmissionPage);
    const text = wrapper.text();
    expect(text).toContain("Google Tag Manager");
    expect(text).toContain("Google Fonts");
    expect(text).toContain("Supabase");
    expect(text).toContain("Render");
    expect(text).toContain("AWS API Gateway");
  });

  it("最終更新日と問い合わせ先 mailto リンクが表示される", () => {
    const wrapper = mount(ExternalTransmissionPage);
    expect(wrapper.text()).toContain("最終更新日");
    const mailto = wrapper.find('[data-testid="contact-mailto"]');
    expect(mailto.exists()).toBe(true);
    expect(mailto.attributes("href")).toMatch(/^mailto:/);
  });

  it("「Cookie 同意設定を変更する」ボタン押下で同意パネルが開く", async () => {
    const consent = useConsentPanel();
    consent.close();
    expect(consent.isOpen.value).toBe(false);

    const wrapper = mount(ExternalTransmissionPage);
    await wrapper
      .find('[data-testid="open-consent-panel"]')
      .trigger("click");

    expect(consent.isOpen.value).toBe(true);
    consent.close();
  });
});
