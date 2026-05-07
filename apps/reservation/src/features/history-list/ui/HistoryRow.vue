<script setup lang="ts">
import { computed } from "vue";
import {
  formatReservationNumber,
  ReservationStatusBadge,
  type MyReservationItem,
} from "@/entities/reservation";
import {
  jstDay,
  jstHours,
  jstMinutes,
  jstMonth,
  jstWeekday,
} from "@/shared/lib/jst-calendar";

const props = defineProps<{
  item: MyReservationItem;
  /** 予約中グループに表示する行のみ true。true のときキャンセルボタンを描画 */
  showCancel?: boolean;
}>();

const emit = defineEmits<{
  "request-cancel": [item: MyReservationItem];
}>();

const startDate = computed(() => new Date(props.item.event.startAt));
const endDate = computed(() => new Date(props.item.event.endAt));

const monthDay = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(jstMonth(d) + 1).padStart(2, "0")}/${String(
    jstDay(d),
  ).padStart(2, "0")}`;
});

const dayOfWeek = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "";
  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][jstWeekday(d)];
});

const timeRange = computed(() => {
  const fmt = (d: Date) =>
    `${String(jstHours(d)).padStart(2, "0")}:${String(
      jstMinutes(d),
    ).padStart(2, "0")}`;
  if (Number.isNaN(startDate.value.getTime())) return "";
  if (Number.isNaN(endDate.value.getTime())) return fmt(startDate.value);
  return `${fmt(startDate.value)}–${fmt(endDate.value)}`;
});

const reservationNumber = computed(() =>
  formatReservationNumber(props.item.id),
);

const isCancelled = computed(() => props.item.status === "cancelled");

function onCancelClick(): void {
  emit("request-cancel", props.item);
}
</script>

<template>
  <article
    class="bg-surface border border-hairline rounded-hq-lg px-hq-4 py-hq-3 flex items-stretch gap-hq-3"
    :data-status="item.status"
    data-testid="history-row"
  >
    <div
      class="flex flex-col items-center justify-center pr-hq-3 border-r border-hairline shrink-0"
      style="min-width: 56px;"
    >
      <span
        class="font-mono text-xs text-ink"
        style="letter-spacing: 0.04em;"
      >{{ monthDay }}</span>
      <span
        class="font-mono text-[10px] text-muted mt-hq-1"
        style="letter-spacing: 0.18em;"
      >{{ dayOfWeek }}</span>
    </div>

    <div class="flex-1 min-w-0 flex flex-col gap-hq-1">
      <p
        class="font-jp text-sm m-0 truncate"
        :class="
          isCancelled ? 'text-muted line-through' : 'text-ink font-medium'
        "
        data-testid="history-row-title"
      >{{ item.event.name }}</p>
      <p
        class="font-jp text-xs text-muted m-0 truncate"
      >{{ item.event.venueName }} · {{ timeRange }}</p>
      <p
        class="font-mono text-[10px] text-muted m-0"
        style="letter-spacing: 0.1em;"
      >#{{ reservationNumber }}</p>

      <button
        v-if="showCancel"
        type="button"
        class="self-start font-jp text-xs text-accent border border-accent rounded-full px-hq-3 py-hq-1 hover:bg-accent-soft transition-colors mt-hq-2"
        data-testid="history-row-cancel"
        @click="onCancelClick"
      >予約をキャンセル</button>
    </div>

    <div class="flex items-start shrink-0">
      <ReservationStatusBadge :status="item.status" />
    </div>
  </article>
</template>
