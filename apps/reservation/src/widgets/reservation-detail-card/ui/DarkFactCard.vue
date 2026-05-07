<script setup lang="ts">
import { computed } from "vue";
import {
  jstDay,
  jstHours,
  jstMinutes,
  jstMonth,
  jstWeekday,
} from "@/shared/lib/jst-calendar";
import { formatCountdown } from "../lib/format-countdown";

/**
 * 予約詳細画面の Dark Fact Card。
 *
 * - kicker: 「— あと N 日」/「— 当日」/「— 開催終了」
 * - 開催日: `MM / DD` + 曜日略号 (`MON` 等)
 * - 時間 + 会場: `HH:mm – HH:mm · {会場名}`
 *
 * すべて JST 固定。マジックナンバー禁止 (Tailwind preset utility 経由)。
 *
 * 関連:
 *   openspec/changes/reservation-detail-page/specs/reservation-detail-page/spec.md
 *     Requirement: Dark Fact Card
 */

const WEEKDAY_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const props = defineProps<{
  startAt: string;
  endAt: string;
  venueName: string;
  /** テスト時の固定 now (省略時は new Date()) */
  now?: Date;
}>();

const startDate = computed(() => new Date(props.startAt));
const endDate = computed(() => new Date(props.endAt));

const countdown = computed(() =>
  formatCountdown(props.startAt, props.now ?? new Date()),
);

const countdownClass = computed(() => {
  // 7 日以内 (= imminent / 当日 / 開催終了直後) のみ accent、それ以遠は muted
  if (countdown.value.tone === "imminent") {
    return "text-accent";
  }
  // ended は控えめに (灰色)、normal も同様
  return "text-paper opacity-60";
});

const monthDay = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(jstMonth(d) + 1).padStart(2, "0")} / ${String(
    jstDay(d),
  ).padStart(2, "0")}`;
});

const weekdayLabel = computed(() => {
  const d = startDate.value;
  if (Number.isNaN(d.getTime())) return "";
  return WEEKDAY_EN[jstWeekday(d)];
});

const timeRange = computed(() => {
  const fmt = (d: Date) =>
    `${String(jstHours(d)).padStart(2, "0")}:${String(
      jstMinutes(d),
    ).padStart(2, "0")}`;
  if (Number.isNaN(startDate.value.getTime())) return "";
  if (Number.isNaN(endDate.value.getTime())) return fmt(startDate.value);
  return `${fmt(startDate.value)} – ${fmt(endDate.value)}`;
});
</script>

<template>
  <section
    class="bg-ink text-paper rounded-hq-md px-hq-5 py-hq-5 flex flex-col gap-hq-2"
    data-testid="dark-fact-card"
  >
    <p
      class="font-mono text-xs tracking-widest m-0"
      :class="countdownClass"
      data-testid="countdown-label"
    >{{ countdown.label }}</p>
    <p class="font-jp-display text-3xl font-medium m-0 leading-tight">
      <span data-testid="month-day">{{ monthDay }}</span>
      <span
        class="font-mono text-sm ml-hq-2 tracking-widest opacity-60"
        data-testid="weekday-label"
      >{{ weekdayLabel }}</span>
    </p>
    <p class="font-jp text-sm opacity-75 m-0">
      <span data-testid="time-range">{{ timeRange }}</span>
      <span aria-hidden="true"> · </span>
      <span data-testid="venue-name">{{ venueName }}</span>
    </p>
  </section>
</template>
