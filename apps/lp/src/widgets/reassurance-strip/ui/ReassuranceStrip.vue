<template>
  <section class="reassurance" aria-labelledby="reassurance-heading">
    <header class="reassurance__head">
      <Kicker color="ink">— Easy to start</Kicker>
      <h2 id="reassurance-heading" class="reassurance__title">来る前に、これだけ。</h2>
    </header>

    <article class="reassurance__primary">
      <div class="reassurance__ico" aria-hidden="true">👜</div>
      <div>
        <div class="reassurance__label">持ち物</div>
        <div class="reassurance__items">
          <span v-for="item in items" :key="item" class="reassurance__chip">
            <span class="reassurance__dot" aria-hidden="true" />
            {{ item }}
          </span>
        </div>
      </div>
    </article>

    <div class="reassurance__grid">
      <article class="reassurance__cell">
        <div class="reassurance__cell-ico" aria-hidden="true">👟</div>
        <div>
          <div class="reassurance__label">服装</div>
          <div class="reassurance__value">動きやすい服</div>
        </div>
      </article>
      <article class="reassurance__cell">
        <div class="reassurance__cell-ico" aria-hidden="true">💴</div>
        <div>
          <div class="reassurance__label">参加費</div>
          <div class="reassurance__value">500円 or 1,000円</div>
        </div>
      </article>
    </div>

    <p class="reassurance__note">
      参加費は会場により 500円 / 1,000円。<br />
      開催は土日祝の 18:00–20:00 が中心です。
    </p>
  </section>
</template>

<script setup>
import { Kicker } from '@high-q/ui'

const items = ['飲み物', '運動着', '体育館シューズ']
</script>

<style scoped>
.reassurance {
  background: var(--hq-color-paper);
  padding: 32px 24px;
  padding-inline: max(24px, calc((100% - 720px) / 2));
  border-bottom: 1px solid var(--hq-color-hairline);
}

.reassurance__head {
  text-align: center;
  margin-bottom: 20px;
}

.reassurance__title {
  font-family: var(--hq-font-jp-display);
  font-size: 18px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
  margin: 8px 0 0;
}

.reassurance__primary {
  background: var(--hq-color-paper-warm);
  padding: 18px;
  border-radius: 4px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 18px;
  align-items: center;
  margin-bottom: 10px;
}

.reassurance__ico {
  font-size: 28px;
  line-height: 1;
}

.reassurance__cell-ico {
  font-size: 22px;
  line-height: 1;
}

.reassurance__label {
  font-family: var(--hq-font-mono);
  font-size: 9px;
  letter-spacing: 0.15em;
  color: var(--hq-color-muted);
  margin-bottom: 6px;
}

.reassurance__items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-family: var(--hq-font-jp);
  font-size: 13px;
  font-weight: 500;
  color: var(--hq-color-ink-soft);
}

.reassurance__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reassurance__dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--hq-color-muted);
  display: inline-block;
}

.reassurance__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.reassurance__cell {
  background: var(--hq-color-paper-warm);
  padding: 14px;
  border-radius: 4px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.reassurance__cell .reassurance__label {
  margin-bottom: 3px;
}

.reassurance__value {
  font-family: var(--hq-font-jp);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--hq-color-ink);
}

.reassurance__note {
  margin: 16px 0 0;
  font-family: var(--hq-font-jp);
  font-size: 12px;
  line-height: 1.8;
  color: var(--hq-color-ink-soft);
  text-align: center;
}
</style>
