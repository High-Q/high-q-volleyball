<script setup lang="ts">
import { computed } from "vue";
import type { EventListItem } from "@/entities/event";
import { formatFee, formatTimeRange } from "@/shared/lib/format-date";
import {
  jstDay,
  jstMonth,
  jstWeekday,
} from "@/shared/lib/jst-calendar";
import AvailabilityChip from "@/shared/ui/AvailabilityChip.vue";

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

const props = defineProps<{
  event: EventListItem;
  /** availability 取得中の間は true (一覧画面側で loading フラグを束ねて渡す) */
  availabilityLoading?: boolean;
}>();

const startDate = computed(() => new Date(props.event.startAt));

const monthDay = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(jstMonth(d) + 1).padStart(2, "0")} / ${String(jstDay(d)).padStart(2, "0")}`;
});

const weekday = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAY_JA[jstWeekday(d)];
});

const timeLabel = computed(() =>
  formatTimeRange(props.event.startAt, props.event.endAt),
);
const feeLabel = computed(() => formatFee(props.event.fee));
</script>

<template>
  <router-link
    :to="{ name: 'event-detail', params: { id: event.id } }"
    class="flex items-center gap-hq-4 px-hq-4 py-hq-4 bg-paper-warm border border-hairline rounded-hq-md no-underline text-ink hover:shadow-hq-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition"
    data-testid="event-row"
  >
    <div
      class="flex flex-col items-center justify-center pr-hq-3 border-r border-hairline shrink-0"
      style="width: 64px;"
    >
      <span
        class="font-mono text-sm font-medium text-ink"
        data-testid="event-row-date"
      >{{ monthDay }}</span>
      <span
        class="font-mono text-[10px] text-muted tracking-widest mt-hq-1"
        data-testid="event-row-weekday"
      >{{ weekday }}</span>
    </div>

    <div class="flex-1 min-w-0 flex flex-col gap-hq-1">
      <p
        class="font-jp text-sm font-medium text-ink m-0 truncate"
        data-testid="event-row-name"
      >{{ event.name }}</p>
      <p class="font-jp text-xs text-muted m-0">
        <span data-testid="event-row-time">{{ timeLabel }}</span>
        <span aria-hidden="true"> · </span>
        <span data-testid="event-row-fee">{{ feeLabel }}</span>
      </p>
      <AvailabilityChip
        :availability="event.availability"
        :loading="availabilityLoading"
      />
    </div>
  </router-link>
</template>
