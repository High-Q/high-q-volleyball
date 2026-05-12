<template>
  <section class="features" aria-labelledby="features-heading">
    <header class="features__head">
      <Kicker color="accent">— Why High Q</Kicker>
      <h2 id="features-heading" class="features__heading">
        3つの<br />ちょうどよさ。
      </h2>
      <p class="features__lead">What makes us, us.</p>
    </header>

    <article v-for="item in items" :key="item.n" class="features__item">
      <Photo :label="item.photo" :h="280" />
      <div class="features__body">
        <div class="features__row">
          <span class="features__number">{{ item.n }}</span>
          <Kicker color="accent">{{ item.kicker }}</Kicker>
        </div>
        <h3 class="features__title">{{ item.jp }}</h3>
        <p class="features__text">{{ item.body }}</p>
      </div>
    </article>
  </section>
</template>

<script setup>
import { Kicker, Photo } from '@high-q/ui'

const items = [
  {
    n: '01',
    kicker: 'BEGINNER FRIENDLY',
    jp: '初心者でも、本当に大丈夫。',
    body: '参加者の 2〜3割 は初心者です。基礎練習（パス・スパイク）では、経験者がしっかりレクチャーします。',
    photo: '練習・パス',
  },
  {
    n: '02',
    kicker: 'CALM VIBE',
    jp: '落ち着いた、大人の集まり。',
    body: '20〜30代の社会人が中心。ノリで圧倒することはありません。お酒が苦手な人も歓迎です。',
    photo: 'after game · izakaya',
  },
  {
    n: '03',
    kicker: 'NO PRESSURE',
    jp: '無理しない、月1〜2回。',
    body: '土日祝の日中または夜間に、月1〜2回。来れる時だけ参加でOK。年に1回だけ来る人もいます。',
    photo: 'gym · evening',
  },
]
</script>

<style scoped>
.features {
  background: var(--hq-color-paper-warm);
  padding-bottom: 24px;
}

.features__head {
  padding: 72px 28px 36px;
  padding-inline: max(28px, calc((100% - 720px) / 2));
}

.features__item {
  margin-bottom: 48px;
  max-width: 880px;
  margin-inline: auto;
}

.features__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 26px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
  margin: 12px 0 6px;
}

.features__lead {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--hq-color-muted);
  text-transform: uppercase;
  margin: 0;
}

.features__body {
  padding: 20px 28px 0;
}

.features__row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}

.features__number {
  font-family: var(--hq-font-jp-display);
  font-size: 24px;
  font-weight: 600;
  color: var(--hq-color-accent);
  line-height: 1;
}

.features__title {
  font-family: var(--hq-font-jp-display);
  font-size: 22px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
  margin: 0 0 12px;
}

.features__text {
  font-family: var(--hq-font-jp);
  font-size: 14.5px;
  line-height: 2;
  color: var(--hq-color-ink-soft);
  margin: 0;
}
</style>
