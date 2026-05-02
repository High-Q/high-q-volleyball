<script setup lang="ts">
import { computed } from "vue";
import { Kicker } from "@high-q/ui";
import type { EventDetailRow } from "@/entities/event-detail";

/**
 * イベント詳細のサマリ StatCard 4 枚。
 *
 * 1 番目は `capacity` 有無で動的切替（D8）:
 *   - capacity = NULL → 「予約数」 reserved_count 名
 *   - capacity あり → 「残席」 (capacity - reserved_count) / capacity 名
 *
 * 2 番目「チェックイン」は RemainBar と同じビジュアル言語の進捗バー +
 * 数値併記で表示する (taken=checked_in / capacity=reserved)。
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D8)
 */

const props = defineProps<{
  row: EventDetailRow;
}>();

interface NumberStat {
  kind: "number";
  k: string;
  label: string;
  value: string;
  unit: string;
}

interface BarStat {
  kind: "bar";
  k: string;
  label: string;
  taken: number;
  capacity: number;
}

type Stat = NumberStat | BarStat;

const stats = computed<Stat[]>(() => {
  const r = props.row;
  // 1 番目: capacity 有無で動的切替
  const first: NumberStat =
    r.capacity === null
      ? {
          kind: "number",
          k: "01",
          label: "予約数",
          value: String(r.reserved_count),
          unit: "名",
        }
      : {
          kind: "number",
          k: "01",
          label: "残席",
          value: String(Math.max(0, r.capacity - r.reserved_count)),
          unit: `/ ${r.capacity} 名`,
        };

  return [
    first,
    {
      kind: "bar",
      k: "02",
      label: "チェックイン",
      taken: r.checked_in_count,
      capacity: r.reserved_count,
    },
    {
      kind: "number",
      k: "03",
      label: "初回参加",
      value: String(r.first_time_count),
      unit: "名",
    },
    {
      kind: "number",
      k: "04",
      label: "キャンセル待ち",
      value: String(r.waitlist_count),
      unit: "名",
    },
  ];
});

function fillRatio(taken: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(taken / capacity, 1);
}
</script>

<template>
  <div
    class="grid grid-cols-4 bg-surface border border-hairline rounded-hq-lg overflow-hidden"
  >
    <div
      v-for="(s, i) in stats"
      :key="s.k"
      class="py-hq-5 px-hq-6"
      :class="i < stats.length - 1 ? 'border-r border-hairline-soft' : ''"
      data-testid="event-stat-card"
    >
      <div class="mb-hq-1">
        <Kicker color="muted">— {{ s.k }}</Kicker>
      </div>

      <template v-if="s.kind === 'number'">
        <div class="flex items-baseline gap-hq-1">
          <span
            class="font-jp text-2xl font-semibold text-ink"
            data-testid="stat-value"
          >{{ s.value }}</span>
          <span class="font-jp text-xs text-muted" data-testid="stat-unit">{{
            s.unit
          }}</span>
        </div>
      </template>

      <template v-else>
        <div class="flex items-baseline gap-hq-1">
          <span
            class="font-jp text-2xl font-semibold text-ink"
            data-testid="stat-value"
          >{{ s.taken }}</span>
          <span class="font-jp text-xs text-muted" data-testid="stat-unit">/
            {{ s.capacity }}</span>
        </div>
        <div
          class="hq-stat-bar mt-hq-2"
          role="progressbar"
          :aria-valuenow="s.taken"
          :aria-valuemin="0"
          :aria-valuemax="s.capacity"
          :aria-label="`チェックイン進捗 ${s.taken} / ${s.capacity}`"
          data-testid="stat-bar"
        >
          <div
            class="hq-stat-bar__fill"
            :style="{ width: `${fillRatio(s.taken, s.capacity) * 100}%` }"
          />
        </div>
      </template>

      <div
        class="font-jp text-xs text-muted mt-hq-1"
        data-testid="stat-label"
      >
        {{ s.label }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.hq-stat-bar {
  width: 100%;
  height: 4px;
  background: var(--hq-color-hairline);
  border-radius: var(--hq-radius-pill);
  overflow: hidden;
}

.hq-stat-bar__fill {
  height: 100%;
  background: var(--hq-color-ink);
  border-radius: var(--hq-radius-pill);
  transition: width 200ms ease;
}
</style>
