<template>
  <section class="faq" aria-labelledby="faq-heading">
    <header class="faq__head">
      <Kicker color="muted">— FAQ</Kicker>
      <h2 id="faq-heading" class="faq__heading">よくある質問。</h2>
      <p class="faq__lead">Just in case.</p>
    </header>

    <ul class="faq__list">
      <li
        v-for="(item, i) in items"
        :key="i"
        class="faq__item"
      >
        <button
          type="button"
          class="faq__btn"
          :aria-expanded="open === i"
          :aria-controls="`faq-answer-${i}`"
          @click="toggle(i)"
        >
          <span class="faq__q">
            <span class="faq__index">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="faq__q-text">{{ item.q }}</span>
          </span>
          <span class="faq__icon" :class="{ 'faq__icon--open': open === i }" aria-hidden="true">+</span>
        </button>
        <div
          v-show="open === i"
          :id="`faq-answer-${i}`"
          class="faq__a"
          role="region"
        >
          {{ item.a }}
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { Kicker } from '@high-q/ui'

const items = [
  { q: '持ち物は何が必要？', a: '飲み物・運動着・体育館シューズの3点です。' },
  { q: '参加費はいくら？', a: '会場により 500円 または 1,000円。会場費・ボール代に使われます。' },
  { q: 'ひとりで来ても大丈夫？', a: 'ぜんぜん大丈夫です。ほとんどの方が初回はひとりで来ています。' },
  { q: '途中参加・途中退出はできる？', a: 'もちろんOK。仕事の都合で途中から、なども問題ありません。' },
  { q: '加入の手続きは必要？', a: '特別な加入手続きはありません。来たい時に予約して来てもらうスタイルです。' },
  { q: '雨の日はどうなる？', a: '会場は屋内なので、雨でも実施します。台風など特別な場合のみ中止連絡をします。' },
]

const open = ref(0)
function toggle(i) {
  open.value = open.value === i ? -1 : i
}
</script>

<style scoped>
.faq {
  background: var(--hq-color-paper-warm);
  padding: 72px 28px 56px;
  padding-inline: max(28px, calc((100% - 720px) / 2));
}

.faq__head {
  margin-bottom: 24px;
}

.faq__heading {
  font-family: var(--hq-font-jp-display);
  font-size: 26px;
  line-height: 1.55;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--hq-color-ink);
  margin: 12px 0 6px;
}

.faq__lead {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--hq-color-muted);
  text-transform: uppercase;
  margin: 0;
}

.faq__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.faq__item {
  border-bottom: 1px solid var(--hq-color-hairline);
}

.faq__item:first-child {
  border-top: 1px solid var(--hq-color-hairline);
}

.faq__btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
}

.faq__btn:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 2px;
}

.faq__q {
  display: inline-flex;
  align-items: baseline;
  gap: 12px;
}

.faq__index {
  font-family: var(--hq-font-jp-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--hq-color-muted);
}

.faq__q-text {
  font-family: var(--hq-font-jp);
  font-size: 15px;
  font-weight: 500;
  color: var(--hq-color-ink);
}

.faq__icon {
  font-family: var(--hq-font-jp);
  font-size: 22px;
  font-weight: 300;
  color: var(--hq-color-muted);
  transition: transform 200ms ease;
}

.faq__icon--open {
  transform: rotate(45deg);
}

.faq__a {
  padding: 0 0 20px 32px;
  font-family: var(--hq-font-jp);
  font-size: 14px;
  line-height: 1.9;
  color: var(--hq-color-ink-soft);
}
</style>
