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
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 *   openspec/changes/admin-event-detail-screen/design.md (D8)
 */

const props = defineProps<{
  row: EventDetailRow;
}>();

interface Stat {
  k: string;
  label: string;
  value: string;
  unit: string;
}

const stats = computed<Stat[]>(() => {
  const r = props.row;
  // 1 番目: capacity 有無で動的切替
  const first: Stat =
    r.capacity === null
      ? {
          k: "01",
          label: "予約数",
          value: String(r.reserved_count),
          unit: "名",
        }
      : {
          k: "01",
          label: "残席",
          value: String(Math.max(0, r.capacity - r.reserved_count)),
          unit: `/ ${r.capacity} 名`,
        };

  return [
    first,
    {
      k: "02",
      label: "チェックイン",
      value: String(r.checked_in_count),
      unit: `/ ${r.reserved_count}`,
    },
    {
      k: "03",
      label: "初回参加",
      value: String(r.first_time_count),
      unit: "名",
    },
    {
      k: "04",
      label: "キャンセル待ち",
      value: String(r.waitlist_count),
      unit: "名",
    },
  ];
});
</script>

<template>
  <div
    class="grid grid-cols-4 bg-paper border border-hairline rounded-hq-lg overflow-hidden"
  >
    <div
      v-for="(s, i) in stats"
      :key="s.k"
      class="px-hq-5 py-hq-4"
      :class="i < stats.length - 1 ? 'border-r border-hairline' : ''"
      data-testid="event-stat-card"
    >
      <Kicker color="muted">— {{ s.k }}</Kicker>
      <div class="flex items-baseline gap-hq-1 mt-hq-1">
        <span
          class="font-jp text-2xl font-semibold text-ink"
          data-testid="stat-value"
        >{{ s.value }}</span>
        <span class="font-jp text-xs text-muted" data-testid="stat-unit">{{
          s.unit
        }}</span>
      </div>
      <div
        class="font-jp text-xs text-muted mt-hq-1"
        data-testid="stat-label"
      >
        {{ s.label }}
      </div>
    </div>
  </div>
</template>
