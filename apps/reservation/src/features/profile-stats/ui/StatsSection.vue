<script setup lang="ts">
import { computed } from "vue";
import { Kicker } from "@high-q/ui";
import type { MyReservationItem } from "@/entities/reservation";
import { formatJaDate } from "@/shared/lib/format-date";
import { computeStats } from "../lib/computeStats";
import ReservationStatusBadge from "./ReservationStatusBadge.vue";

const props = defineProps<{
  reservations: ReadonlyArray<MyReservationItem>;
}>();

const emit = defineEmits<{
  "request-cancel": [item: MyReservationItem];
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

const isEmpty = computed(() => props.reservations.length === 0);

function isCancellableNow(item: MyReservationItem, now: Date = new Date()): boolean {
  if (item.status !== "reserved") return false;
  const start = Date.parse(item.event.startAt);
  if (Number.isNaN(start)) return false;
  return start > now.getTime();
}
</script>

<template>
  <section class="flex flex-col gap-hq-3" aria-label="参加履歴と統計">
    <Kicker color="muted">— STATS · これまでの参加</Kicker>
    <div
      class="bg-surface border border-hairline rounded-hq-lg overflow-hidden"
    >
      <dl class="grid grid-cols-[92px_1fr] gap-hq-3 px-hq-4 py-hq-4">
        <dt class="font-mono text-xs text-muted self-center" style="letter-spacing: 0.14em;">累計参加</dt>
        <dd class="font-jp text-sm text-ink m-0">
          {{ stats.attendedCount }} 回
        </dd>
        <dt class="font-mono text-xs text-muted self-center border-t border-hairline pt-hq-3" style="letter-spacing: 0.14em;">最終参加</dt>
        <dd class="font-jp text-sm text-ink m-0 border-t border-hairline pt-hq-3">{{ lastAttendedLabel }}</dd>
        <dt class="font-mono text-xs text-muted self-center border-t border-hairline pt-hq-3" style="letter-spacing: 0.14em;">次回予定</dt>
        <dd class="font-jp text-sm text-ink m-0 border-t border-hairline pt-hq-3 truncate">{{ nextLabel }}</dd>
      </dl>
    </div>

    <div class="flex flex-col gap-hq-3 mt-hq-2">
      <Kicker color="muted">— HISTORY · 予約履歴</Kicker>
      <div
        v-if="isEmpty"
        class="bg-surface border border-hairline rounded-hq-lg px-hq-4 py-hq-5 text-center"
      >
        <p class="font-jp text-sm text-muted m-0">
          まだ参加履歴がありません。
        </p>
      </div>
      <ul
        v-else
        class="flex flex-col gap-hq-2 list-none p-0 m-0"
      >
        <li
          v-for="item in reservations"
          :key="item.id"
          class="bg-surface border border-hairline rounded-hq-lg px-hq-4 py-hq-3 flex flex-col gap-hq-2"
        >
          <div class="flex items-center justify-between gap-hq-3">
            <span
              class="font-jp text-xs text-muted"
            >{{ formatJaDate(item.event.startAt) }}</span>
            <ReservationStatusBadge :status="item.status" />
          </div>
          <p class="font-jp text-sm text-ink m-0 truncate">{{ item.event.name }}</p>
          <p class="font-jp text-xs text-muted m-0 truncate">{{ item.event.venueName }}</p>
          <button
            v-if="isCancellableNow(item)"
            type="button"
            class="self-start font-jp text-xs text-accent border border-accent rounded-full px-hq-3 py-hq-1 hover:bg-accent-soft transition-colors"
            @click="emit('request-cancel', item)"
          >予約をキャンセル</button>
        </li>
      </ul>
    </div>
  </section>
</template>
