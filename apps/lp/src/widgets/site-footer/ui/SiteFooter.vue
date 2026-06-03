<template>
  <footer class="site-footer" role="contentinfo">
    <div class="site-footer__brand">
      <span class="site-footer__brand-name">High Q</span>
      <span class="site-footer__brand-region">江東区</span>
    </div>

    <p class="site-footer__desc">
      東京・江東区を中心に活動する<br />
      社会人バレーボールサークルです。
    </p>

    <nav class="site-footer__anchors" aria-label="サイト内ナビゲーション">
      <a href="#about-heading" class="site-footer__anchor">About</a>
      <a href="#features-heading" class="site-footer__anchor">Features</a>
      <a href="#flow-heading" class="site-footer__anchor">当日の流れ</a>
      <a href="#event-list-heading" class="site-footer__anchor">Events</a>
      <a href="#faq-heading" class="site-footer__anchor">FAQ</a>
    </nav>

    <nav class="site-footer__sns" aria-label="SNS / 連絡">
      <a :href="LINE_OPEN_CHAT_URL" target="_blank" rel="noopener noreferrer" class="site-footer__sns-link">
        LINE OpenChat <span aria-hidden="true">↗</span>
      </a>
      <a :href="X_URL" target="_blank" rel="noopener noreferrer" class="site-footer__sns-link">
        X (Twitter) <span aria-hidden="true">↗</span>
      </a>
    </nav>

    <div class="site-footer__divider" />

    <nav class="site-footer__legal" aria-label="法務リンク">
      <a href="/privacy" class="site-footer__legal-link" data-testid="footer-privacy-link">
        プライバシーポリシー
      </a>
      <a href="/external-transmission" class="site-footer__legal-link" data-testid="footer-external-transmission-link">
        外部送信ポリシー
      </a>
      <a
        href="#"
        class="site-footer__legal-link"
        data-testid="footer-cookie-settings"
        @click.prevent="openConsent"
      >
        Cookie 設定
      </a>
    </nav>

    <p class="site-footer__copyright">
      © {{ year }} HIGH Q VOLLEYBALL CIRCLE
    </p>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConsentPanel } from '@shared/lib/consentPanel'
import { LINE_OPEN_CHAT_URL, X_URL } from '@shared/config/sns'

const year = computed(() => new Date().getFullYear())

const consent = useConsentPanel()
function openConsent() {
  consent.open()
}
</script>

<style scoped>
.site-footer {
  background: var(--hq-color-ink);
  color: var(--hq-color-paper);
  padding: 40px 28px 24px;
  padding-inline: max(28px, calc((100% - 880px) / 2));
  border-top: 1px solid rgba(247, 243, 234, 0.08);
  font-family: var(--hq-font-jp);
}

.site-footer__brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 18px;
}

.site-footer__brand-name {
  font-family: var(--hq-font-jp-display);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(247, 243, 234, 1);
}

.site-footer__brand-region {
  font-family: var(--hq-font-jp);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: rgba(247, 243, 234, 0.55);
}

.site-footer__desc {
  font-size: 12px;
  line-height: 1.9;
  color: rgba(247, 243, 234, 0.72);
  margin: 0 0 24px;
}

.site-footer__anchors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  font-size: 12px;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(247, 243, 234, 0.12);
}

.site-footer__anchor {
  color: rgba(247, 243, 234, 0.72);
  text-decoration: none;
  letter-spacing: 0.04em;
}

.site-footer__anchor:hover {
  color: rgba(247, 243, 234, 1);
  text-decoration: underline;
}

.site-footer__sns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 16px;
  font-size: 12px;
  margin-bottom: 24px;
}

.site-footer__sns-link {
  color: rgba(247, 243, 234, 1);
  text-decoration: none;
  letter-spacing: 0.04em;
}

.site-footer__sns-link:hover {
  text-decoration: underline;
}

.site-footer__divider {
  height: 1px;
  background: rgba(247, 243, 234, 0.12);
  margin-bottom: 16px;
}

.site-footer__legal {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin-bottom: 16px;
  font-size: 12px;
}

.site-footer__legal-link {
  color: rgba(247, 243, 234, 0.55);
  text-decoration: underline;
  letter-spacing: 0.02em;
}

.site-footer__legal-link:hover {
  color: rgba(247, 243, 234, 1);
}

.site-footer__copyright {
  font-family: var(--hq-font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgba(247, 243, 234, 0.45);
  margin: 0;
}
</style>
