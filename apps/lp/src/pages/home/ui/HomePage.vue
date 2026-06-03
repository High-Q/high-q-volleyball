<template>
  <div id="top">
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-300"
        leave-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showWithdrawalNotice"
          data-testid="lp-withdrawal-notice"
          role="status"
          aria-live="polite"
          :style="noticeStyle"
          class="rounded-hq-md shadow-hq-md bg-success-soft text-ink font-jp text-sm"
        >
          会員データの削除が完了しました。ご利用ありがとうございました。
        </div>
      </Transition>
    </Teleport>

    <HeroFirst />
    <NextSessionStrip />
    <ReassuranceStrip />
    <MetaStrip />
    <AboutSection />
    <FeaturesSection />
    <FirstTimeFlow />
    <WorriesSection />
    <EventList />
    <FaqSection />
    <NotForYouSection />
    <GallerySnsSection />
    <FinalCtaSection />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { HeroFirst } from "@widgets/hero-first";
import { NextSessionStrip } from "@widgets/next-session-strip";
import { ReassuranceStrip } from "@widgets/reassurance-strip";
import { MetaStrip } from "@widgets/meta-strip";
import { AboutSection } from "@widgets/about-section";
import { FeaturesSection } from "@widgets/features-section";
import { FirstTimeFlow } from "@widgets/first-time-flow";
import { WorriesSection } from "@widgets/worries-section";
import { EventList } from "@widgets/event-list";
import { FaqSection } from "@widgets/faq-section";
import { NotForYouSection } from "@widgets/not-for-you";
import { GallerySnsSection } from "@widgets/gallery-sns";
import { FinalCtaSection } from "@widgets/final-cta";

const showWithdrawalNotice = ref<boolean>(false);
let dismissTimer: number | null = null;

// Teleport 先 (body 直下) でも確実に上中央に固定表示されるよう、
// Tailwind utility ではなく inline style で positioning を担保する。
// 関連: openspec/changes/lp-vuetify-to-hq-design-system/design.md
const noticeStyle =
  "position: fixed; top: 16px; left: 50%; transform: translateX(-50%);" +
  " z-index: 100; max-width: 90vw; min-width: 280px;" +
  " padding: 12px 20px;";

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("withdrawn") !== "1") {
    return;
  }

  // ガード: URL を先にクリーニングして「同じ URL で再 onMounted」が走っても
  // 二重発火しないようにする（HMR / 戻る進む等のエッジケース対策）。
  params.delete("withdrawn");
  const next = params.toString();
  const url =
    window.location.pathname +
    (next ? `?${next}` : "") +
    window.location.hash;
  window.history.replaceState({}, "", url);

  showWithdrawalNotice.value = true;
  dismissTimer = window.setTimeout(() => {
    showWithdrawalNotice.value = false;
    dismissTimer = null;
  }, 6000);
});

onUnmounted(() => {
  if (dismissTimer !== null) {
    window.clearTimeout(dismissTimer);
    dismissTimer = null;
  }
});
</script>
