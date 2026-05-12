<template>
  <section class="about" aria-labelledby="about-heading">
    <Kicker color="muted">— About</Kicker>
    <h2 id="about-heading" class="about__heading">
      はじめての人にこそ、<br />来てほしい場所。
    </h2>
    <p class="about__lead">A circle to begin.</p>
    <div class="about__body">
      <p>
        High Q は、東京・江東区を中心に活動する<br />社会人バレーボールサークルです。
      </p>
      <p>
        ガチでもなく、気負わない。<br />
        やりたい時に、来たい人が来る。<br />
        ちょうどいい温度感の場所です。
      </p>
    </div>
    <Photo class="about__photo" label="活動の様子" :h="260" />
  </section>
</template>

<script setup>
import { Kicker, Photo } from '@high-q/ui'
</script>

<style scoped>
.about {
  background: var(--hq-color-surface);
  padding: 72px 28px 56px;
  padding-inline: max(28px, calc((100% - 640px) / 2));
}

.about__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 24px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
  margin: 12px 0 6px;
}

.about__lead {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--hq-color-muted);
  text-transform: uppercase;
  margin: 0 0 28px;
}

.about__body {
  font-family: var(--hq-font-jp);
  font-size: 14.5px;
  line-height: 2;
  color: var(--hq-color-ink-soft);
}

.about__body p {
  margin: 0 0 16px;
}

.about__body p:last-child {
  margin-bottom: 0;
}

.about__photo {
  margin-top: 32px;
}
</style>
