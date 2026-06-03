<template>
  <section class="worries" aria-labelledby="worries-heading">
    <header class="worries__head">
      <div class="worries__kicker">— Before you join</div>
      <h2 id="worries-heading" class="worries__heading">
        来る前の不安を、<br />ぜんぶ。
      </h2>
      <p class="worries__lead">Worries, answered.</p>
    </header>

    <dl class="worries__list">
      <div v-for="(qa, i) in items" :key="i" class="worries__row">
        <dt class="worries__q">
          <span class="worries__marker">Q.</span>
          <span class="worries__q-text">{{ qa.q }}</span>
        </dt>
        <dd class="worries__a">
          <span class="worries__marker worries__marker--a">A.</span>
          <span class="worries__a-text">{{ qa.a }}</span>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
const items = [
  { q: 'ガチ勢ばっかりじゃない？', a: '初心者と経験者が、半々くらいです。' },
  { q: 'ひとりで来ても浮かない？', a: 'ほとんどの人がひとりで来ます。幹事が紹介する時間もあります。' },
  { q: 'ガツガツした雰囲気はちょっと…', a: '懇親会も任意。落ち着いた雰囲気で、お酒が苦手でも大丈夫です。' },
  { q: '毎週は通えないかも…', a: '月1〜2回ペース。来れる時だけでOK。年1回の人も。' },
]
</script>

<style scoped>
.worries {
  background: var(--hq-color-ink);
  color: var(--hq-color-paper);
  padding: 80px 28px;
  padding-inline: max(28px, calc((100% - 720px) / 2));
}

.worries__head {
  margin-bottom: 32px;
}

.worries__kicker {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 500;
  color: rgba(247, 243, 234, 0.6);
}

.worries__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 26px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-paper);
  margin: 12px 0 6px;
}

.worries__lead {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: rgba(247, 243, 234, 0.6);
  text-transform: uppercase;
  margin: 0;
}

.worries__list {
  margin: 0;
  padding: 0;
}

.worries__row {
  padding: 22px 0;
  border-bottom: 1px solid rgba(247, 243, 234, 0.18);
}

.worries__row:first-child {
  border-top: 1px solid rgba(247, 243, 234, 0.18);
}

.worries__q,
.worries__a {
  display: flex;
  gap: 14px;
  margin: 0;
}

.worries__q {
  margin-bottom: 12px;
}

.worries__marker {
  font-family: var(--hq-font-jp-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--hq-color-accent);
  line-height: 1;
  flex-shrink: 0;
  letter-spacing: 0.05em;
}

.worries__marker--a {
  color: var(--hq-color-paper);
  opacity: 0.75;
}

.worries__q-text {
  font-family: var(--hq-font-jp);
  font-size: 15px;
  font-weight: 500;
  line-height: 1.6;
  color: var(--hq-color-paper);
}

.worries__a-text {
  font-family: var(--hq-font-jp);
  font-size: 14.5px;
  line-height: 1.85;
  color: var(--hq-color-paper);
  opacity: 0.85;
}
</style>
