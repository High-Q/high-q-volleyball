<script setup lang="ts">
import { computed } from "vue";
import { formatAvailability, type EventDetail } from "@/entities/event";
import { formatFee, formatJaDate, formatTimeRange } from "@/shared/lib/format-date";

const props = defineProps<{
  event: EventDetail;
}>();

const dateLabel = computed(() => formatJaDate(props.event.startAt));
const timeLabel = computed(() =>
  formatTimeRange(props.event.startAt, props.event.endAt),
);
const feeLabel = computed(() => formatFee(props.event.fee));
const availability = computed(() => formatAvailability(props.event.availability));

const toneClass: Record<"ok" | "warn" | "full", string> = {
  ok: "text-ink",
  warn: "text-warn",
  full: "text-danger",
};

const items = computed(() => [
  {
    key: "datetime",
    label: "DATE & TIME",
    value: `${dateLabel.value} ${timeLabel.value}`,
    valueClass: "text-ink",
  },
  {
    key: "venue-name",
    label: "VENUE",
    value: props.event.venueName,
    valueClass: "text-ink",
  },
  {
    key: "meeting-point",
    label: "MEETING POINT",
    value: props.event.meetingPoint,
    valueClass: "text-ink",
  },
  { key: "fee", label: "FEE", value: feeLabel.value, valueClass: "text-ink" },
  {
    key: "availability",
    label: "AVAILABILITY",
    value: availability.value.text,
    valueClass: toneClass[availability.value.tone],
  },
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
      :data-testid="`event-info-${item.key}`"
    >
      <dt
        class="font-mono text-xs text-muted tracking-widest uppercase m-0"
      >
        {{ item.label }}
      </dt>
      <dd
        class="font-jp text-sm mt-hq-1 m-0"
        :class="item.valueClass"
      >
        {{ item.value }}
      </dd>
    </div>
  </dl>
</template>
