<script setup lang="ts">
import { useConsentPanel } from "@/shared/lib/consentPanel";
import { EXTERNAL_TRANSMISSION_URL } from "@/shared/lib/externalLinks";

const consent = useConsentPanel();

function openConsent(): void {
  consent.open();
}
</script>

<template>
  <footer
    class="border-t border-hairline bg-paper-warm text-muted font-jp"
    data-testid="app-footer"
  >
    <div class="mx-auto max-w-screen-xl flex flex-wrap items-center justify-between gap-hq-2 px-hq-6 py-hq-4 text-xs">
      <p>© {{ new Date().getFullYear() }} High Q.</p>
      <nav aria-label="法務リンク" class="flex items-center gap-hq-3">
        <a
          :href="EXTERNAL_TRANSMISSION_URL"
          target="_blank"
          rel="noreferrer"
          class="text-accent underline"
          data-testid="footer-policy-link"
        >
          外部送信ポリシー
        </a>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          class="text-accent underline"
          data-testid="footer-cookie-settings"
          @click="openConsent"
        >
          Cookie 設定
        </button>
      </nav>
    </div>
  </footer>
</template>
