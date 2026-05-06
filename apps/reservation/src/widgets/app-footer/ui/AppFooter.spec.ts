// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppFooter from "./AppFooter.vue";
import {
  EXTERNAL_TRANSMISSION_URL,
  PRIVACY_POLICY_URL,
} from "@/shared/lib/externalLinks";

describe("reservation AppFooter 法務リンク群", () => {
  it("プライバシーポリシー / 外部送信ポリシー / Cookie 設定 の 3 リンクが並ぶ", () => {
    const wrapper = mount(AppFooter);

    const privacy = wrapper.find('[data-testid="footer-privacy-link"]');
    const external = wrapper.find('[data-testid="footer-policy-link"]');
    const cookie = wrapper.find('[data-testid="footer-cookie-settings"]');

    expect(privacy.exists()).toBe(true);
    expect(privacy.attributes("href")).toBe(PRIVACY_POLICY_URL);
    expect(privacy.attributes("target")).toBe("_blank");
    expect(privacy.attributes("rel")).toBe("noreferrer");
    expect(privacy.text()).toContain("プライバシーポリシー");

    expect(external.exists()).toBe(true);
    expect(external.attributes("href")).toBe(EXTERNAL_TRANSMISSION_URL);
    expect(external.attributes("target")).toBe("_blank");
    expect(external.attributes("rel")).toBe("noreferrer");

    expect(cookie.exists()).toBe(true);
    expect(cookie.text()).toContain("Cookie 設定");
  });
});
