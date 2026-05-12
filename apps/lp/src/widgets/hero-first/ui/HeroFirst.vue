<template>
  <section class="hero-first" aria-labelledby="hero-heading">
    <Photo class="hero-first__photo" label="hero · 体育館" h="100%" w="100%" />
    <div class="hero-first__overlay">
      <div class="hero-first__body">
        <div class="hero-first__kicker">— Tokyo · Koto-ku</div>
        <h1 id="hero-heading" class="hero-first__heading">
          ひとりで来ても、<br />
          初めてでも、<br />
          だいじょうぶ。
        </h1>
        <p class="hero-first__lead">
          ガチでもなく、ノリすぎず。<br />
          土日祝の日中・夜に、月1〜2回。<br />
          ちょうどいい温度のバレーボールです。
        </p>
        <div class="hero-first__cta">
          <Button
            variant="accent"
            size="md"
            class="hero-first__cta-btn"
            @click="onTrialClick"
          >
            体験参加してみる
          </Button>
        </div>
        <p class="hero-first__meta">所要 1分 ・ 月1〜2回開催 ・ 参加費 500円〜</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { Photo, Button } from '@high-q/ui'
import { reservationTopUrl } from '@shared/config/reservation'

function onTrialClick() {
  const url = reservationTopUrl()
  if (url) window.location.href = url
}
</script>

<style scoped>
.hero-first {
  position: relative;
  width: 100%;
  height: 600px;
  overflow: hidden;
  background: var(--hq-color-ink);
}

@media (min-width: 720px) {
  .hero-first {
    height: 640px;
  }
}

.hero-first__photo {
  position: absolute;
  inset: 0;
}

.hero-first__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  color: var(--hq-color-paper);
  background: linear-gradient(
    180deg,
    rgba(31, 29, 26, 0.7) 0%,
    rgba(31, 29, 26, 0.2) 30%,
    rgba(31, 29, 26, 0.2) 55%,
    rgba(31, 29, 26, 0.85) 100%
  );
}

.hero-first__body {
  padding: 0 28px 28px;
  padding-inline: max(28px, calc((100% - 720px) / 2));
  width: 100%;
  box-sizing: border-box;
}

.hero-first__kicker {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 500;
  color: rgba(247, 243, 234, 0.85);
  margin-bottom: 16px;
}

.hero-first__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 32px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  margin: 0;
  color: var(--hq-color-paper);
}

.hero-first__lead {
  font-family: var(--hq-font-jp);
  font-size: 14px;
  line-height: 1.9;
  margin: 16px 0 0;
  opacity: 0.9;
  max-width: 300px;
}

.hero-first__cta {
  margin-top: 22px;
}

.hero-first__cta-btn {
  width: 100%;
}

.hero-first__meta {
  font-family: var(--hq-font-jp);
  font-size: 12px;
  line-height: 1.7;
  opacity: 0.75;
  text-align: center;
  margin: 8px 0 0;
}
</style>
