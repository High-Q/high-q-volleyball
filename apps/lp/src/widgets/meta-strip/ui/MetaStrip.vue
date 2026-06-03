<template>
  <section class="meta-strip" aria-label="活動メタ情報">
    <div
      v-for="(item, i) in items"
      :key="item.label"
      class="meta-strip__cell"
      :class="{ 'meta-strip__cell--bordered': i < items.length - 1 }"
    >
      <div class="meta-strip__label">{{ item.label }}</div>
      <div class="meta-strip__value">{{ item.value }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
const items = [
  { label: 'エリア', value: '江東区' },
  { label: '開催', value: '土日祝' },
  { label: '頻度', value: '月1〜2回' },
]
</script>

<style scoped>
.meta-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: var(--hq-color-paper);
  padding-inline: max(0px, calc((100% - 720px) / 2));
  border-bottom: 1px solid var(--hq-color-hairline);
}

.meta-strip__cell {
  padding: 20px 12px;
  text-align: center;
}

.meta-strip__cell--bordered {
  border-right: 1px solid var(--hq-color-hairline);
}

.meta-strip__label {
  font-family: var(--hq-font-jp);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--hq-color-muted);
  font-weight: 500;
}

.meta-strip__value {
  font-family: var(--hq-font-jp-display);
  font-size: 18px;
  font-weight: 500;
  margin-top: 8px;
  color: var(--hq-color-ink);
  line-height: 1.2;
  letter-spacing: 0.02em;
}
</style>
