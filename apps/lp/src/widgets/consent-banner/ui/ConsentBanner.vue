<template>
  <v-snackbar
    v-model="visible"
    :timeout="-1"
    location="bottom"
    color="transparent"
    class="consent-banner"
    data-testid="consent-banner"
  >
    <div class="consent-banner__container text-black">
      <div class="consent-banner__body">
        <p class="text-body-2 font-weight-bold mb-1">Cookie の利用について</p>
        <p class="text-caption text-medium-emphasis mb-0 consent-banner__desc">
          分析・計測のための任意 cookie は、同意がある場合のみ有効化します。
          <a href="/external-transmission" class="text-primary">外部送信ポリシー</a>
        </p>
      </div>
      <div class="consent-banner__actions">
        <v-btn
          variant="flat"
          size="small"
          color="primary"
          class="consent-banner__btn"
          data-testid="consent-accept-all"
          @click="acceptAll"
        >
          全て許可
        </v-btn>
        <v-btn
          variant="outlined"
          size="small"
          color="default"
          class="consent-banner__btn"
          data-testid="consent-reject"
          @click="reject"
        >
          拒否
        </v-btn>
      </div>
    </div>
  </v-snackbar>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { getConsent, setConsent } from "@high-q/shared/consent";
import { useConsentPanel } from "@shared/lib/consentPanel";

const visible = ref(false);

const panel = useConsentPanel();

function refreshFromStorage() {
  const current = getConsent();
  visible.value = current === null;
}

onMounted(() => {
  refreshFromStorage();
});

watch(panel.isOpen, (open) => {
  if (open) {
    visible.value = true;
  }
});

function close() {
  visible.value = false;
  panel.close();
}

function acceptAll() {
  setConsent({ necessary: true, analytics: true });
  close();
}

function reject() {
  setConsent({ necessary: true, analytics: false });
  close();
}
</script>

<style scoped>
.consent-banner :deep(.v-snackbar__wrapper) {
  max-width: min(1000px, calc(100vw - 32px));
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px) saturate(1.5);
  -webkit-backdrop-filter: blur(14px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
.consent-banner :deep(.v-snackbar__content) {
  width: 100%;
  padding: 12px 16px;
}
.consent-banner__container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.consent-banner__body {
  min-width: 0;
}
.consent-banner__desc {
  line-height: 1.4;
}
.consent-banner__actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
  width: 100%;
}
.consent-banner__btn {
  flex: 1;
}
</style>
