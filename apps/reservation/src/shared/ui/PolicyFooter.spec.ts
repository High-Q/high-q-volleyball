// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PolicyFooter from "./PolicyFooter.vue";
import {
  EXTERNAL_TRANSMISSION_URL,
  PRIVACY_POLICY_URL,
} from "@/shared/lib/externalLinks";

describe("PolicyFooter (reservation 共通プリミティブ)", () => {
  it("プライバシーポリシーリンクは LP の URL を target=_blank で開く", () => {
    const wrapper = mount(PolicyFooter, {
      props: { lead: "テスト用 lead" },
    });
    const privacyLink = wrapper.find('[data-testid="policy-footer-privacy-link"]');
    expect(privacyLink.attributes("href")).toBe(PRIVACY_POLICY_URL);
    expect(privacyLink.attributes("target")).toBe("_blank");
    expect(privacyLink.attributes("rel")).toBe("noreferrer");
  });

  it("外部送信ポリシーリンクは LP の URL を target=_blank で開く", () => {
    const wrapper = mount(PolicyFooter, {
      props: { lead: "テスト用 lead" },
    });
    const externalLink = wrapper.find('[data-testid="policy-footer-external-link"]');
    expect(externalLink.attributes("href")).toBe(EXTERNAL_TRANSMISSION_URL);
    expect(externalLink.attributes("target")).toBe("_blank");
    expect(externalLink.attributes("rel")).toBe("noreferrer");
  });

  it("lead と storageNote prop の文言を表示する", () => {
    const wrapper = mount(PolicyFooter, {
      props: {
        lead: "本人確認用です",
        storageNote: "Supabase に保管します",
      },
    });
    expect(wrapper.text()).toContain("本人確認用です");
    expect(wrapper.text()).toContain("Supabase に保管します");
  });
});
