<script setup lang="ts">
import { computed } from "vue";
import type { ReservationStatus } from "@/entities/reservation";

const props = defineProps<{
  status: ReservationStatus;
}>();

const LABELS: Record<ReservationStatus, string> = {
  reserved: "予約中",
  attended: "参加済",
  cancelled: "キャンセル済",
  no_show: "未参加",
  waitlist: "キャンセル待ち",
};

const TONE_CLASSES: Record<ReservationStatus, string> = {
  reserved: "bg-accent-soft text-accent border-accent",
  attended: "bg-surface text-ink border-hairline",
  cancelled: "bg-paper text-muted border-hairline",
  no_show: "bg-paper text-muted border-hairline",
  waitlist: "bg-surface text-ink border-hairline",
};

const label = computed(() => LABELS[props.status]);
const tone = computed(() => TONE_CLASSES[props.status]);
</script>

<template>
  <span
    :class="['font-jp text-xs inline-flex items-center px-hq-2 py-hq-1 rounded-full border', tone]"
    style="line-height: 1;"
  >{{ label }}</span>
</template>
