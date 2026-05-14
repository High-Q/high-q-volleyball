<template>
  <v-app class="lp-app">
    <SiteHeader :transparent="pathname === '/'" />
    <v-main class="lp-app__main" :class="{ 'lp-app__main--padded': pathname !== '/' }">
      <div class="lp-app__frame">
        <HomePage v-if="pathname === '/'" />
        <ExternalTransmissionPage v-else-if="pathname === '/external-transmission'" />
        <PrivacyPolicyPage v-else-if="pathname === '/privacy'" />
        <NotFoundView v-else />
      </div>
    </v-main>
    <div class="lp-app__footer">
      <SiteFooter />
    </div>
    <ConsentBanner />
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { SiteHeader } from "@widgets/site-header";
import { SiteFooter } from "@widgets/site-footer";
import NotFoundView from "@shared/ui/NotFoundView.vue";
import { HomePage } from "@pages/home";
import { ExternalTransmissionPage } from "@pages/external-transmission";
import { PrivacyPolicyPage } from "@pages/privacy";
import { ConsentBanner } from "@widgets/consent-banner";
import { getConsent, onConsentChange } from "@high-q/shared/consent";
import { loadGtm } from "@shared/lib/loadGtm";

const pathname = ref(
  typeof window === "undefined" ? "/" : window.location.pathname,
);

let unsubConsent = null;
let popHandler = null;

function syncGtmFromConsent() {
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

/* sticky header 分のオフセットで、アンカー遷移時に見出しが隠れないようにする */
[id="about-heading"],
[id="features-heading"],
[id="flow-heading"],
[id="event-list-heading"],
[id="faq-heading"] {
  scroll-margin-top: 80px;
}

.lp-app {
  background: var(--hq-color-paper);
  color: var(--hq-color-ink);
  font-family: var(--hq-font-jp);
}

.lp-app__main.v-main {
  --v-layout-top: 0px;
  padding-top: 0 !important;
  background: var(--hq-color-paper);
}

.lp-app__frame {
  width: 100%;
  background: var(--hq-color-paper);
}

.lp-app__footer {
  background: var(--hq-color-ink);
}
</style>
