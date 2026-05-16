<template>
  <v-footer color="primary" class="py-10">
    <v-container>
      <div class="footer-brand text-h5 font-weight-black text-white mb-2">
        High Q
      </div>
      <p class="footer-desc">
        東京都江東区を中心に活動する社会人バレーボールサークル
      </p>

      <v-divider class="my-6" color="white" opacity="0.2" />

      <div class="footer-legal text-center mb-4">
        <a
          href="/privacy"
          class="footer-legal__link"
          data-testid="footer-privacy-link"
        >プライバシーポリシー</a>
        <span class="footer-legal__sep" aria-hidden="true">/</span>
        <a
          href="/external-transmission"
          class="footer-legal__link"
          data-testid="footer-external-transmission-link"
        >外部送信ポリシー</a>
        <span class="footer-legal__sep" aria-hidden="true">/</span>
        <a
          href="#"
          class="footer-legal__link"
          data-testid="footer-cookie-settings"
          @click.prevent="openConsent"
        >Cookie 設定</a>
      </div>

      <div class="footer-copyright text-center">
        © {{ new Date().getFullYear() }} High Q. All rights reserved.
      </div>
    </v-container>
  </v-footer>
</template>

<script setup>
import { useConsentPanel } from "@shared/lib/consentPanel";

const consent = useConsentPanel();
function openConsent() {
  consent.open();
}
</script>

<style scoped>
.footer-brand {
  letter-spacing: 0.05em;
}

.footer-desc {
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.85rem;
  line-height: 1.7;
  margin: 0;
}

.footer-copyright {
  color: #fff;
  font-size: 0.75rem;
}

.footer-legal {
  font-size: 0.8rem;
}
.footer-legal__link {
  color: rgba(255, 255, 255, 0.92);
  text-decoration: underline;
}
.footer-legal__sep {
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0.5em;
}
</style>
