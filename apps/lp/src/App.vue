<template>
  <v-app>
    <HeaderLine></HeaderLine>
    <v-main :class="{ 'main-no-pad': pathname === '/' }">
      <HomePage v-if="pathname === '/'"></HomePage>
      <ExternalTransmissionPage v-else-if="pathname === '/external-transmission'" />
      <NotFoundView v-else />
    </v-main>
    <FooterLine></FooterLine>
    <ConsentBanner />
  </v-app>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import HeaderLine from "@shared/ui/HeaderLine.vue";
import FooterLine from "@shared/ui/FooterLine.vue";
import NotFoundView from "@shared/ui/NotFoundView.vue";
import { HomePage } from "@pages/home";
import { ExternalTransmissionPage } from "@pages/external-transmission";
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
/* HeaderLine を独自 fixed header に切替たため、v-main の自動 padding-top を打ち消す。
   これにより Hero が画面最上部から始まり、透明 Header の背景に Hero 画像が見える。
   body の margin / padding reset は vuetify/styles (vuetify.js で import) が
   担当するため、ここでは触らない */
.main-no-pad.v-main {
  --v-layout-top: 0px;
  padding-top: 0 !important;
}
</style>
