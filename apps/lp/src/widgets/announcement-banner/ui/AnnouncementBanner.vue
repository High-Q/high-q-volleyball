<template>
  <!-- 掲載対象が無い / Loading / 取得失敗のときは何も描画しない（本体優先・fail-silent）。 -->
  <section
    v-if="hasItems"
    class="announcement-banner"
    data-testid="announcement-banner"
    aria-label="お知らせ"
  >
    <Kicker color="accent">— Information</Kicker>
    <ul class="announcement-banner__items">
      <li
        v-for="item in items"
        :key="item.id"
        class="announcement-banner__item"
        :data-announcement-id="item.id"
      >
        <h3 class="announcement-banner__title">{{ item.title }}</h3>
        <!-- 本文はプレーンテキスト。v-html は使わず改行のみ保持する（XSS 防止）。 -->
        <p class="announcement-banner__body">{{ item.body }}</p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { Kicker } from '@high-q/ui'
import { useAnnouncements } from '../model/useAnnouncements'

const { items, hasItems } = useAnnouncements()
</script>

<style scoped>
.announcement-banner {
  background: var(--hq-color-paper-warm);
  padding: 36px 28px;
  padding-inline: max(28px, calc((100% - 880px) / 2));
  border-bottom: 1px solid var(--hq-color-hairline);
}

.announcement-banner__items {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.announcement-banner__item {
  background: var(--hq-color-paper);
  border: 1px solid var(--hq-color-hairline);
  border-left: 3px solid var(--hq-color-accent);
  border-radius: 4px;
  padding: 16px 20px;
}

.announcement-banner__title {
  font-family: var(--hq-font-jp);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.6;
  color: var(--hq-color-ink);
  margin: 0 0 6px;
}

.announcement-banner__body {
  font-family: var(--hq-font-jp);
  font-size: 13.5px;
  line-height: 1.85;
  color: var(--hq-color-ink-soft);
  margin: 0;
  /* 改行をそのまま表示する（プレーンテキスト）。 */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
