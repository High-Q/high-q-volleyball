// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  getConsent,
} from "@high-q/shared/consent";
import ConsentBanner from "./ConsentBanner.vue";
import { useConsentPanel } from "@/shared/lib/consentPanel";

describe("ConsentBanner (admin)", () => {
  beforeEach(() => {
    localStorage.clear();
    useConsentPanel().close();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("同意未決定なら初回表示でバナーが見える", async () => {
    const wrapper = mount(ConsentBanner);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="consent-banner"]').exists()).toBe(true);
  });

  it("同意済 (analytics: true) なら初回表示でバナーが見えない", async () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        necessary: true,
        analytics: true,
        decidedAt: new Date().toISOString(),
      }),
    );
    const wrapper = mount(ConsentBanner);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="consent-banner"]').exists()).toBe(false);
  });

  it("「全て許可」で analytics: true として保存しバナーが閉じる", async () => {
    const wrapper = mount(ConsentBanner);
    await wrapper.vm.$nextTick();

    await wrapper.find('[data-testid="consent-accept-all"]').trigger("click");
    await wrapper.vm.$nextTick();

    const decision = getConsent();
    expect(decision).not.toBeNull();
    expect(decision!.analytics).toBe(true);
    expect(wrapper.find('[data-testid="consent-banner"]').exists()).toBe(false);
  });

  it("「拒否」で analytics: false として保存しバナーが閉じる", async () => {
    const wrapper = mount(ConsentBanner);
    await wrapper.vm.$nextTick();

    await wrapper.find('[data-testid="consent-reject"]').trigger("click");
    await wrapper.vm.$nextTick();

    const decision = getConsent();
    expect(decision!.analytics).toBe(false);
  });

  it("ボタンは「全て許可」「拒否」の 2 つだけで「設定」ボタンは存在しない", async () => {
    const wrapper = mount(ConsentBanner);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="consent-accept-all"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="consent-reject"]').exists()).toBe(true);
    expect(
      wrapper.find('[data-testid="consent-toggle-details"]').exists(),
    ).toBe(false);
    expect(
      wrapper.find('[data-testid="consent-analytics-toggle"]').exists(),
    ).toBe(false);
    expect(wrapper.find('[data-testid="consent-save"]').exists()).toBe(false);
  });

  it("useConsentPanel().open() で同意済ユーザーにもバナーが再表示される", async () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        necessary: true,
        analytics: false,
        decidedAt: new Date().toISOString(),
      }),
    );
    const wrapper = mount(ConsentBanner);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="consent-banner"]').exists()).toBe(false);

    useConsentPanel().open();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="consent-banner"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="consent-accept-all"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="consent-reject"]').exists()).toBe(true);
  });
});
