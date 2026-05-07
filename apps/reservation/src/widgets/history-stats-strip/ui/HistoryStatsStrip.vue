<script setup lang="ts">
import { computed } from "vue";
import type { HistoryStats } from "@/features/history-stats-strip";

const props = defineProps<{
  stats: HistoryStats;
}>();

type Cell = {
  key: "TOTAL" | "NEXT" | "STREAK";
  value: string;
  unit: string;
};

const cells = computed<ReadonlyArray<Cell>>(() => [
  {
    key: "TOTAL",
    value: String(props.stats.attendedCount),
    unit: "回 参加",
  },
  {
    key: "NEXT",
    value: props.stats.daysToNext === null ? "—" : String(props.stats.daysToNext),
    unit: "日後",
  },
  {
    key: "STREAK",
    value: String(props.stats.streakMonths),
    unit: "ヶ月連続",
  },
]);
</script>

<template>
  <dl
    class="grid grid-cols-3 bg-paper-warm border border-hairline rounded-hq-lg px-hq-3 py-hq-4 m-0"
    aria-label="参加統計"
    data-testid="history-stats-strip"
  >
    <div
      v-for="(cell, idx) in cells"
      :key="cell.key"
      class="flex flex-col items-center text-center px-hq-2"
      :class="idx > 0 ? 'border-l border-hairline' : ''"
    >
      <dt
        class="font-mono text-xs text-muted m-0"
        style="letter-spacing: 0.14em;"
      >{{ cell.key }}</dt>
      <dd class="m-0 mt-hq-1">
        <span
          class="font-jp-display text-xl text-ink"
          style="letter-spacing: 0.02em;"
          :data-testid="`history-stats-${cell.key.toLowerCase()}`"
        >{{ cell.value }}</span>
        <span class="font-jp text-xs text-muted ml-hq-1">{{ cell.unit }}</span>
      </dd>
    </div>
  </dl>
</template>
