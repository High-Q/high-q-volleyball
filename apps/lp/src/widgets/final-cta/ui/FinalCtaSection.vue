<template>
  <section class="final-cta" aria-labelledby="final-cta-heading">
    <Photo
      class="final-cta__photo"
      src="/images/final-cta.jpg"
      alt="体育館の床に並べられた 3 足の体育館シューズ"
      tone="cta"
      h="100%"
      w="100%"
    />
    <div class="final-cta__overlay">
      <div class="final-cta__kicker">— Join us</div>
      <h2 id="final-cta-heading" class="final-cta__heading">
        まずは1回、<br />見学だけでも。
      </h2>
      <p class="final-cta__lead">
        月1〜2回、土日祝に開催しています。<br />
        LINE オープンチャットで次回告知が届きます。<br />
        不安があれば、まずは質問だけでも。
      </p>

      <div class="final-cta__actions">
        <a
          :href="LINE_OPEN_CHAT_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="final-cta__btn-primary"
          data-testid="final-cta-line"
        >
          LINE で相談・告知を受け取る
        </a>
        <p class="final-cta__connector">または、まずは</p>
        <a
          href="#event-list-heading"
          class="final-cta__btn-secondary"
          data-testid="final-cta-event-list"
        >
          次回イベントを見る
        </a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Photo } from '@high-q/ui'
import { LINE_OPEN_CHAT_URL } from '@shared/config/sns'
</script>

<style scoped>
.final-cta {
  position: relative;
  min-height: 460px;
  overflow: hidden;
  background: var(--hq-color-ink);
}

.final-cta__photo {
  position: absolute;
  inset: 0;
}

.final-cta__overlay {
  position: relative;
  min-height: 460px;
  padding: 72px 28px 56px;
  padding-inline: max(28px, calc((100% - 640px) / 2));
  color: var(--hq-color-paper);
  background: linear-gradient(
    180deg,
    rgba(31, 29, 26, 0.4) 0%,
    rgba(31, 29, 26, 0.85) 100%
  );
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.final-cta__kicker {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 500;
  color: rgba(247, 243, 234, 0.85);
}

.final-cta__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 28px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-paper);
  margin: 16px 0 18px;
}

.final-cta__lead {
  font-family: var(--hq-font-jp);
  font-size: 14px;
  line-height: 2;
  opacity: 0.85;
  margin: 0 0 28px;
}

.final-cta__actions {
  display: grid;
  gap: 10px;
}

.final-cta__connector {
  margin: 4px 0;
  text-align: center;
  font-family: var(--hq-font-jp);
  font-size: 12px;
  opacity: 0.7;
}

.final-cta__btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 14px 22px;
  border-radius: var(--hq-radius-pill);
  background: var(--hq-color-paper);
  color: var(--hq-color-ink);
  font-family: var(--hq-font-jp);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.05em;
  text-decoration: none;
  min-height: 48px;
  box-sizing: border-box;
  border: 1px solid var(--hq-color-paper);
  transition: opacity 120ms ease;
}

.final-cta__btn-primary:hover {
  opacity: 0.88;
}

.final-cta__btn-primary:focus-visible {
  outline: 2px solid var(--hq-color-paper);
  outline-offset: 2px;
}

.final-cta__btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 22px;
  border-radius: var(--hq-radius-pill);
  border: 1px solid rgba(247, 243, 234, 0.4);
  background: transparent;
  color: var(--hq-color-paper);
  font-family: var(--hq-font-jp);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  letter-spacing: 0.05em;
  min-height: 48px;
  box-sizing: border-box;
  transition: border-color 150ms ease, background 150ms ease;
}

.final-cta__btn-secondary:hover {
  border-color: var(--hq-color-paper);
  background: rgba(247, 243, 234, 0.06);
}

.final-cta__btn-secondary:focus-visible {
  outline: 2px solid var(--hq-color-paper);
  outline-offset: 2px;
}

</style>
