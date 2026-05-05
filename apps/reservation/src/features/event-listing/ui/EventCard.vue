<script setup lang="ts">
import { computed } from "vue";
import type { EventListItem } from "@/entities/event";
import { formatFee, formatJaDate, formatTimeRange } from "@/shared/lib/format-date";

const props = defineProps<{
  event: EventListItem;
}>();

const dateLabel = computed(() => formatJaDate(props.event.startAt));
const timeLabel = computed(() =>
  formatTimeRange(props.event.startAt, props.event.endAt),
);
const feeLabel = computed(() => formatFee(props.event.fee));
</script>

<template>
  <router-link
    :to="{ name: 'event-detail', params: { id: event.id } }"
    class="block bg-surface border border-hairline rounded-hq-lg p-hq-5 no-underline text-ink hover:shadow-hq-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition"
  >
    <div class="flex flex-col gap-hq-2">
      <div class="text-xs font-mono text-ink tracking-wider">
        {{ dateLabel }}
      </div>

      <h3 class="font-jp-display text-base font-medium text-ink leading-snug m-0">
        {{ event.name }}
      </h3>

      <div class="font-jp text-xs text-muted">
        {{ event.venueName }} · {{ timeLabel }}
      </div>

      <div class="font-jp text-xs text-muted text-right">
        {{ feeLabel }}
      </div>
    </div>
  </router-link>
</template>
