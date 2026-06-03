<template>
  <div class="lp-app">
    <SiteHeader :transparent="pathname === '/'" />
    <main class="lp-app__main" :class="{ 'lp-app__main--padded': pathname !== '/' }">
      <div class="lp-app__frame">
        <HomePage v-if="pathname === '/'" />
        <ExternalTransmissionPage v-else-if="pathname === '/external-transmission'" />
        <PrivacyPolicyPage v-else-if="pathname === '/privacy'" />
        <NotFoundView v-else />
      </div>
    </main>
    <div class="lp-app__footer">
      <SiteFooter />
    </div>
    <ConsentBanner />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineAsyncComponent } from "vue";
import { SiteHeader } from "@widgets/site-header";
import { SiteFooter } from "@widgets/site-footer";
import { HomePage } from "@pages/home";
import { ConsentBanner } from "@widgets/consent-banner";

// 初回 paint 必須は HomePage のみ。他は dynamic import で別 chunk 化。
// 関連: openspec/specs/lp-build-optimization/spec.md
const ExternalTransmissionPage = defineAsyncComponent(() =>
  import("@pages/external-transmission").then((m) => m.ExternalTransmissionPage),
);
const PrivacyPolicyPage = defineAsyncComponent(() =>
  import("@pages/privacy").then((m) => m.PrivacyPolicyPage),
);
const NotFoundView = defineAsyncComponent(() =>
  import("@shared/ui/NotFoundView.vue"),
);
import { getConsent, onConsentChange } from "@high-q/shared/consent";
import { loadGtm } from "@shared/lib/loadGtm";

const pathname = ref<string>(
  typeof window === "undefined" ? "/" : window.location.pathname,
);

let unsubConsent: (() => void) | null = null;
let popHandler: (() => void) | null = null;

function syncGtmFromConsent(): void {
  const current = getConsent();
  if (current?.analytics === true) {
    loadGtm();
  }
}

onMounted(() => {
  syncGtmFromConsent();
  unsubConsent = onConsentChange((decision) => {
    if (decision.analytics) loadGtm();
  });

  popHandler = () => {
    pathname.value = window.location.pathname;
  };
  window.addEventListener("popstate", popHandler);
});

onUnmounted(() => {
  if (unsubConsent) unsubConsent();
  if (popHandler) window.removeEventListener("popstate", popHandler);
});
</script>

<style>
html {
  scroll-behavior: smooth;
}

body.is-locked {
  overflow: hidden;
}

/* sticky header 分のオフセットで、アンカー遷移時に見出しが隠れないようにする */
[id="about-heading"],
[id="features-heading"],
[id="flow-heading"],
[id="event-list-heading"],
[id="faq-heading"] {
  scroll-margin-top: 80px;
}

.lp-app {
  min-height: 100vh;
  background: var(--hq-color-paper);
  color: var(--hq-color-ink);
  font-family: var(--hq-font-jp);
  display: flex;
  flex-direction: column;
}

.lp-app__main {
  flex: 1;
  background: var(--hq-color-paper);
}

.lp-app__main--padded {
  padding-top: 80px; /* sticky header 分のオフセット */
}

.lp-app__frame {
  width: 100%;
  background: var(--hq-color-paper);
}

.lp-app__footer {
  background: var(--hq-color-ink);
}
</style>
