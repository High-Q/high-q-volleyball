<template>
  <Teleport to="body">
    <Transition name="consent-banner">
      <div
        v-if="visible"
        class="consent-banner"
        role="dialog"
        aria-modal="false"
        aria-labelledby="consent-banner-title"
        data-testid="consent-banner"
      >
        <div class="consent-banner__inner">
          <div class="consent-banner__body">
            <p id="consent-banner-title" class="consent-banner__title">
              Cookie の利用について
            </p>
            <p class="consent-banner__desc">
              分析・計測のための任意 cookie は、同意がある場合のみ有効化します。
              <a
                href="/external-transmission"
                class="consent-banner__link"
              >外部送信ポリシー</a>
            </p>
          </div>
          <div class="consent-banner__actions">
            <button
              type="button"
              class="consent-banner__btn consent-banner__btn--primary"
              data-testid="consent-accept-all"
              @click="acceptAll"
            >
              全て許可
            </button>
            <button
              type="button"
              class="consent-banner__btn consent-banner__btn--secondary"
              data-testid="consent-reject"
              @click="reject"
            >
              拒否
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { getConsent, setConsent } from '@high-q/shared/consent'
import { useConsentPanel } from '@shared/lib/consentPanel'

const visible = ref(false)
const panel = useConsentPanel()

function refreshFromStorage() {
  const current = getConsent()
  visible.value = current === null
}

onMounted(() => {
  refreshFromStorage()
})

watch(panel.isOpen, (open) => {
  if (open) {
    visible.value = true
  }
})

function close() {
  visible.value = false
  panel.close()
}

function acceptAll() {
  setConsent({ necessary: true, analytics: true })
  close()
}

function reject() {
  setConsent({ necessary: true, analytics: false })
  close()
}
</script>

<style scoped>
.consent-banner {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  width: calc(100vw - 32px);
  max-width: 720px;
  z-index: 9000;
  background: var(--hq-color-paper);
  color: var(--hq-color-ink);
  border: 1px solid var(--hq-color-hairline);
  border-radius: var(--hq-radius-md);
  box-shadow: var(--hq-shadow-md);
  font-family: var(--hq-font-jp);
}

.consent-banner__inner {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.consent-banner__body {
  min-width: 0;
}

.consent-banner__title {
  margin: 0 0 6px;
  font-family: var(--hq-font-jp-display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
}

.consent-banner__desc {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--hq-color-ink-soft);
}

.consent-banner__link {
  color: var(--hq-color-ink-soft);
  text-decoration: underline;
}

.consent-banner__actions {
  display: flex;
  gap: 8px;
}

.consent-banner__btn {
  flex: 1;
  min-height: 40px;
  padding: 8px 16px;
  border-radius: var(--hq-radius-pill);
  border: 1px solid transparent;
  background: transparent;
  font-family: var(--hq-font-jp);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: opacity 120ms ease, background 120ms ease;
}

.consent-banner__btn:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 2px;
}

.consent-banner__btn--primary {
  background: var(--hq-color-ink);
  color: var(--hq-color-paper);
  border-color: var(--hq-color-ink);
}

.consent-banner__btn--primary:hover {
  opacity: 0.88;
}

.consent-banner__btn--secondary {
  background: transparent;
  color: var(--hq-color-ink);
  border-color: var(--hq-color-hairline);
}

.consent-banner__btn--secondary:hover {
  background: var(--hq-color-paper-warm);
}

@media (min-width: 600px) {
  .consent-banner__inner {
    flex-direction: row;
    align-items: center;
    gap: 20px;
  }

  .consent-banner__actions {
    flex-shrink: 0;
  }

  .consent-banner__btn {
    flex: 0 0 auto;
    min-width: 96px;
  }
}

/* Transition */
.consent-banner-enter-active,
.consent-banner-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.consent-banner-enter-from,
.consent-banner-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}

@media (prefers-reduced-motion: reduce) {
  .consent-banner-enter-active,
  .consent-banner-leave-active {
    transition: none;
  }
}
</style>
