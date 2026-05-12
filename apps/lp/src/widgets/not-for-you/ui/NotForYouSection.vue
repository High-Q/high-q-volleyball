<template>
  <section class="nfy" aria-labelledby="nfy-heading">
    <header class="nfy__head">
      <Kicker color="muted">— Honest note</Kicker>
      <h2 id="nfy-heading" class="nfy__heading">
        こんな方には、<br />合わないかもしれません。
      </h2>
      <p class="nfy__lead">Honestly speaking.</p>
    </header>

    <p class="nfy__intro">
      合わない場所に来てもらっても、<br />
      お互いに気を使うだけになってしまうので、<br />
      正直にお伝えします。
    </p>

    <ul class="nfy__list">
      <li v-for="(item, i) in items" :key="i" class="nfy__item">
        <span class="nfy__mark" aria-hidden="true">×</span>
        <div>
          <div class="nfy__title">{{ item.t }}</div>
          <p class="nfy__text">{{ item.d }}</p>
        </div>
      </li>
    </ul>

    <p class="nfy__close">
      逆に、上のどれも当てはまらないなら、<br />
      ぜひ一度遊びに来てください。
    </p>
  </section>
</template>

<script setup>
import { Kicker } from '@high-q/ui'

const items = [
  { t: '勝つことが第一目的の人', d: 'High Q は勝敗より、楽しむことを大事にしています。' },
  { t: '毎週ガッツリ練習したい人', d: '月1〜2回ペース。物足りなく感じるかもしれません。' },
  { t: 'お酒や交流を強要したい人', d: '懇親会は完全任意。バレーだけ参加もまったく問題ありません。' },
]
</script>

<style scoped>
.nfy {
  background: var(--hq-color-paper);
  padding: 72px 28px 64px;
  padding-inline: max(28px, calc((100% - 640px) / 2));
  border-top: 1px solid var(--hq-color-hairline);
}

.nfy__head {
  margin-bottom: 28px;
}

.nfy__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 24px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
  margin: 12px 0 6px;
}

.nfy__lead {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--hq-color-muted);
  text-transform: uppercase;
  margin: 0;
}

.nfy__intro {
  font-family: var(--hq-font-jp);
  font-size: 13px;
  line-height: 1.95;
  color: var(--hq-color-ink-soft);
  margin: 0 0 24px;
}

.nfy__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nfy__item {
  padding: 18px 0;
  border-bottom: 1px solid var(--hq-color-hairline);
  display: flex;
  gap: 14px;
}

.nfy__item:first-child {
  border-top: 1px solid var(--hq-color-hairline);
}

.nfy__mark {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--hq-color-muted);
  color: var(--hq-color-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  margin-top: 2px;
}

.nfy__title {
  font-family: var(--hq-font-jp-display);
  font-size: 15px;
  font-weight: 500;
  color: var(--hq-color-ink);
  margin-bottom: 6px;
  letter-spacing: 0.01em;
}

.nfy__text {
  font-family: var(--hq-font-jp);
  font-size: 14px;
  line-height: 1.85;
  color: var(--hq-color-ink-soft);
  margin: 0;
}

.nfy__close {
  margin-top: 22px;
  font-family: var(--hq-font-jp);
  font-size: 12.5px;
  line-height: 1.95;
  color: var(--hq-color-ink-soft);
  text-align: center;
}
</style>
