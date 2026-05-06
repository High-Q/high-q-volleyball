<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { getConsent, setConsent } from "@high-q/shared/consent";
import { Button } from "@high-q/ui";
import { useConsentPanel } from "@/shared/lib/consentPanel";
import { EXTERNAL_TRANSMISSION_URL } from "@/shared/lib/externalLinks";

const visible = ref(false);

const panel = useConsentPanel();
let stopWatchPanel: (() => void) | null = null;

function syncFromStorage(): void {
  visible.value = getConsent() === null;
}

onMounted(() => {
  syncFromStorage();
  stopWatchPanel = watch(panel.isOpen, (open) => {
    if (open) {
      visible.value = true;
    }
  });
});

onUnmounted(() => {
  stopWatchPanel?.();
});

function close(): void {
  visible.value = false;
  panel.close();
}

function acceptAll(): void {
  setConsent({ necessary: true, analytics: true });
  close();
}

function reject(): void {
  setConsent({ necessary: true, analytics: false });
  close();
}
</script>

<template>
  <div
    v-if="visible"
    role="dialog"
    aria-label="Cookie 同意設定"
    data-testid="consent-banner"
    class="consent-banner-glass fixed bottom-hq-4 left-hq-4 right-hq-4 z-50 mx-auto max-w-5xl rounded-hq-lg p-hq-4 font-jp text-ink"
  >
    <div class="flex flex-col gap-hq-3">
      <div class="flex flex-col">
        <p class="text-sm font-semibold text-ink mb-hq-1">Cookie の利用について</p>
        <p class="text-xs text-muted leading-snug">
          分析・計測のための任意 cookie は、同意がある場合のみ有効化します。
          <a
            :href="EXTERNAL_TRANSMISSION_URL"
            target="_blank"
            rel="noreferrer"
            class="text-accent underline"
            data-testid="banner-policy-link"
          >外部送信ポリシー</a>
        </p>
      </div>

      <div class="flex flex-row gap-hq-2">
        <Button
          variant="primary"
          size="sm"
          class="flex-1"
          data-testid="consent-accept-all"
          @click="acceptAll"
        >
          全て許可
        </Button>
        <Button
          variant="secondary"
          size="sm"
          class="flex-1"
          data-testid="consent-reject"
          @click="reject"
        >
          拒否
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.consent-banner-glass {
  background: rgba(255, 250, 240, 0.72);
  backdrop-filter: blur(14px) saturate(1.5);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
</style>
