<template>
  <section class="flow" aria-labelledby="flow-heading">
    <header class="flow__head">
      <Kicker color="muted">— First time?</Kicker>
      <h2 id="flow-heading" class="flow__heading">
        当日、こんな流れで<br />進みます。
      </h2>
      <p class="flow__lead">So you know what to expect.</p>
    </header>

    <ol class="flow__steps">
      <li v-for="step in steps" :key="step.n" class="flow__step">
        <span class="flow__bullet">{{ step.n }}</span>
        <div class="flow__body">
          <div class="flow__row">
            <span class="flow__title">{{ step.t }}</span>
            <span class="flow__when">{{ step.when }}</span>
          </div>
          <p class="flow__text">{{ step.d }}</p>
        </div>
      </li>
    </ol>

    <aside class="flow__reassurance">
      幹事が常に近くにいるので、<br />
      わからないことは何でも声をかけてください。
    </aside>
  </section>
</template>

<script setup>
import { Kicker } from '@high-q/ui'

const steps = [
  { n: '01', t: '予約する', d: '当日の朝までに、フォームから1分で。', when: '〜前日' },
  { n: '02', t: '会場に向かう', d: '普段着でOK。会場で幹事に「初めてです」と声をかけてください。', when: '当日 17:50' },
  { n: '03', t: '紹介と挨拶', d: '幹事がみんなに軽く紹介してくれます。', when: '18:00' },
  { n: '04', t: '基礎練（パス・スパイク）', d: 'パス・レシーブから、スパイクまで。初心者には経験者がしっかりレクチャーします。', when: '18:00–19:00' },
  { n: '05', t: 'ゲーム形式', d: 'チームを混ぜて。レベル差は気にしないでください。', when: '19:00–20:00' },
  { n: '06', t: '解散・任意で懇親会', d: '20:00 解散。行ける人は近くのお店で軽く一杯（任意）。', when: '20:00–' },
]
</script>

<style scoped>
.flow {
  background: var(--hq-color-paper-warm);
  padding: 72px 28px 64px;
  padding-inline: max(28px, calc((100% - 640px) / 2));
}

.flow__head {
  margin-bottom: 28px;
}

.flow__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 26px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
  margin: 12px 0 6px;
}

.flow__lead {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--hq-color-muted);
  text-transform: uppercase;
  margin: 0;
}

.flow__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.flow__steps::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 16px;
  bottom: 16px;
  width: 1px;
  background: var(--hq-color-hairline);
}

.flow__step {
  display: flex;
  gap: 18px;
  margin-bottom: 24px;
  position: relative;
}

.flow__bullet {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--hq-color-paper);
  border: 1px solid var(--hq-color-hairline);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--hq-font-mono);
  font-size: 9px;
  color: var(--hq-color-accent);
  flex-shrink: 0;
  margin-top: 2px;
  position: relative;
  z-index: 1;
}

.flow__body {
  flex: 1;
}

.flow__row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
}

.flow__title {
  font-family: var(--hq-font-jp-display);
  font-size: 16px;
  font-weight: 500;
  color: var(--hq-color-ink);
}

.flow__when {
  font-family: var(--hq-font-mono);
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--hq-color-muted);
}

.flow__text {
  font-family: var(--hq-font-jp);
  font-size: 14px;
  line-height: 1.85;
  color: var(--hq-color-ink-soft);
  margin: 0;
}

.flow__reassurance {
  margin-top: 16px;
  padding: 16px;
  background: var(--hq-color-paper);
  border-left: 2px solid var(--hq-color-accent);
  font-family: var(--hq-font-jp);
  font-size: 14px;
  line-height: 1.85;
  color: var(--hq-color-ink-soft);
}
</style>
