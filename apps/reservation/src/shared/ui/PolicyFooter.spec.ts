// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import PolicyFooter from "./PolicyFooter.vue";
import { EXTERNAL_TRANSMISSION_URL } from "@/shared/lib/externalLinks";

const Stub = { template: "<div />" };
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: "/privacy", name: "privacy", component: Stub },
    { path: "/", name: "home", component: Stub },
  ],
});

describe("PolicyFooter (reservation 共通プリミティブ)", () => {
  it("プライバシーポリシーリンクは /privacy への RouterLink", () => {
    const wrapper = mount(PolicyFooter, {
      global: { plugins: [router] },
      props: { lead: "テスト用 lead" },
    });
    const links = wrapper.findAll("a");
    const privacyLink = links.find((l) => l.text().includes("プライバシーポリシー"));
    expect(privacyLink?.attributes("href")).toBe("/privacy");
  });

  it("外部送信ポリシーリンクは LP の URL を target=_blank で開く", () => {
    const wrapper = mount(PolicyFooter, {
      global: { plugins: [router] },
      props: { lead: "テスト用 lead" },
    });
    const externalLink = wrapper.find('[data-testid="policy-footer-external-link"]');
    expect(externalLink.attributes("href")).toBe(EXTERNAL_TRANSMISSION_URL);
    expect(externalLink.attributes("target")).toBe("_blank");
    expect(externalLink.attributes("rel")).toBe("noreferrer");
  });

  it("lead と storageNote prop の文言を表示する", () => {
    const wrapper = mount(PolicyFooter, {
      global: { plugins: [router] },
      props: {
        lead: "本人確認用です",
        storageNote: "Supabase に保管します",
      },
    });
    expect(wrapper.text()).toContain("本人確認用です");
    expect(wrapper.text()).toContain("Supabase に保管します");
  });
});
