<script setup lang="ts">
import { computed } from "vue";
import {
  formatReservationNumber,
  type MyReservationItem,
} from "@/entities/reservation";
import { formatCountdownLabel } from "@/widgets/reservation-detail-card";
import {
  jstDay,
  jstHours,
  jstMinutes,
  jstMonth,
  jstWeekday,
} from "@/shared/lib/jst-calendar";

const WEEKDAY_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const props = defineProps<{
  reservation: MyReservationItem;
  /** テスト時の固定 now (省略時は new Date()) */
  now?: Date;
}>();

const startDate = computed(() => new Date(props.reservation.event.startAt));
const endDate = computed(() => new Date(props.reservation.event.endAt));

const countdownLabel = computed(() =>
  formatCountdownLabel(
    props.reservation.event.startAt,
    props.now ?? new Date(),
  ),
);

const monthDay = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(jstMonth(d) + 1).padStart(2, "0")} / ${String(jstDay(d)).padStart(2, "0")}`;
});

const weekdayLabel = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAY_EN[jstWeekday(d)];
});

const timeRange = computed(() => {
  const fmt = (d: Date) =>
    `${String(jstHours(d)).padStart(2, "0")}:${String(jstMinutes(d)).padStart(2, "0")}`;
  if (Number.isNaN(startDate.value.getTime())) return "";
  if (Number.isNaN(endDate.value.getTime())) return fmt(startDate.value);
  return `${fmt(startDate.value)} – ${fmt(endDate.value)}`;
});

const reservationNumber = computed(() =>
  formatReservationNumber(props.reservation.id),
);
</script>

<template>
  <router-link
    :to="{
      name: 'reservation-detail',
      params: { reservationId: reservation.id },
    }"
    class="relative block bg-ink text-paper rounded-hq-lg overflow-hidden no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    data-testid="home-next-card"
  >
    <span
      class="absolute top-hq-4 right-hq-4 inline-flex items-center justify-center rounded-full font-mono text-[10px] tracking-widest text-paper/55 border border-paper/20"
      style="width: 44px; height: 44px;"
      aria-hidden="true"
      data-testid="next-badge"
    >NEXT</span>

    <div class="px-hq-5 pt-hq-6 pb-hq-2 flex flex-col gap-hq-2">
      <p
        class="font-mono text-xs text-accent tracking-widest m-0"
        data-testid="countdown-label"
      >{{ countdownLabel }}</p>

      <p class="font-jp-display text-4xl font-medium m-0 leading-tight flex items-baseline gap-hq-3">
        <span data-testid="month-day">{{ monthDay }}</span>
        <span
          class="font-mono text-xs tracking-widest text-paper/55"
          data-testid="weekday-time"
        >{{ weekdayLabel }} · {{ timeRange }}</span>
      </p>

      <p
        class="font-jp-display text-lg font-medium m-0 leading-snug"
        data-testid="event-name"
      >{{ reservation.event.name }}</p>

      <p
        class="font-jp text-xs text-paper/60 m-0"
        data-testid="venue-name"
      >{{ reservation.event.venueName }}</p>
    </div>

    <div
      class="mt-hq-3 px-hq-5 py-hq-3 border-t border-paper/10 flex items-center gap-hq-3"
    >
      <span
        class="font-jp text-xs text-paper/85"
        data-testid="reservation-number"
      >予約 {{ reservationNumber }}</span>
      <span
        class="ml-auto font-jp text-xs text-paper font-medium inline-flex items-center gap-hq-1"
        data-testid="detail-cta"
      >
        詳細を見る
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M2 7H12M12 7L7.5 2.5M12 7L7.5 11.5"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
          />
        </svg>
      </span>
    </div>
  </router-link>
</template>
