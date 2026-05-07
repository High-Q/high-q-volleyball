<script setup lang="ts">
import { computed } from "vue";
import { Kicker } from "@high-q/ui";
import type { MyReservationItem } from "@/entities/reservation";
import { formatJaDate } from "@/shared/lib/format-date";
import { computeStats } from "../lib/computeStats";

const props = defineProps<{
  reservations: ReadonlyArray<MyReservationItem>;
}>();

const stats = computed(() => computeStats(props.reservations));

const lastAttendedLabel = computed(() =>
  stats.value.lastAttendedAt === null
    ? "—"
    : formatJaDate(stats.value.lastAttendedAt),
);

const nextLabel = computed(() => {
  const next = stats.value.nextUpcoming;
  if (next === null) return "—";
  return `${formatJaDate(next.event.startAt)} ${next.event.name}`;
});
</script>

<template>
  <section class="flex flex-col gap-hq-3" aria-label="参加統計">
    <Kicker color="muted">— STATS · これまでの参加</Kicker>
    <div
      class="bg-surface border border-hairline rounded-hq-lg overflow-hidden"
    >
      <dl class="grid grid-cols-[92px_1fr] gap-hq-3 px-hq-4 py-hq-4">
        <dt class="font-mono text-xs text-muted self-center" style="letter-spacing: 0.14em;">累計参加</dt>
        <dd class="font-jp text-sm text-ink m-0">
          {{ stats.attendedCount === 0 ? "—" : `${stats.attendedCount} 回` }}
        </dd>
        <dt class="font-mono text-xs text-muted self-center border-t border-hairline pt-hq-3" style="letter-spacing: 0.14em;">最終参加</dt>
        <dd class="font-jp text-sm text-ink m-0 border-t border-hairline pt-hq-3">{{ lastAttendedLabel }}</dd>
        <dt class="font-mono text-xs text-muted self-center border-t border-hairline pt-hq-3" style="letter-spacing: 0.14em;">次回予定</dt>
        <dd class="font-jp text-sm text-ink m-0 border-t border-hairline pt-hq-3 truncate">{{ nextLabel }}</dd>
      </dl>
    </div>
  </section>
</template>
