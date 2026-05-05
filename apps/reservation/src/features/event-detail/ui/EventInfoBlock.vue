<script setup lang="ts">
import { computed } from "vue";
import type { EventDetail } from "@/entities/event";
import { formatFee, formatJaDate, formatTimeRange } from "@/shared/lib/format-date";

const props = defineProps<{
  event: EventDetail;
}>();

const dateLabel = computed(() => formatJaDate(props.event.startAt));
const timeLabel = computed(() =>
  formatTimeRange(props.event.startAt, props.event.endAt),
);
const feeLabel = computed(() => formatFee(props.event.fee));

const items = computed(() => [
  {
    key: "datetime",
    label: "DATE & TIME",
    value: `${dateLabel.value} ${timeLabel.value}`,
  },
  { key: "venue-name", label: "VENUE", value: props.event.venueName },
  {
    key: "meeting-point",
    label: "MEETING POINT",
    value: props.event.meetingPoint,
  },
  { key: "fee", label: "FEE", value: feeLabel.value },
]);
</script>

<template>
  <dl
    class="bg-surface border border-hairline rounded-hq-lg overflow-hidden m-0"
  >
    <div
      v-for="(item, index) in items"
      :key="item.key"
      class="px-hq-5 py-hq-4"
      :class="index > 0 ? 'border-t border-hairline' : ''"
    >
      <dt
        class="font-mono text-xs text-muted tracking-widest uppercase m-0"
      >
        {{ item.label }}
      </dt>
      <dd class="font-jp text-sm text-ink mt-hq-1 m-0">
        {{ item.value }}
      </dd>
    </div>
  </dl>
</template>
