<script setup lang="ts">
import { computed } from "vue";
import {
  formatAvailability,
  type AvailabilityTone,
  type EventAvailability,
} from "@/entities/event";

const props = defineProps<{
  /** `event_availability_view` の取得結果。取得失敗時 / 取得中 (loading=true) でも prop は null で OK */
  availability: EventAvailability | null | undefined;
  /** true の間は shimmer プレースホルダを描画する */
  loading?: boolean;
}>();

const display = computed(() => formatAvailability(props.availability));

const toneClass: Record<AvailabilityTone, string> = {
  ok: "text-ink-soft",
  warn: "text-warn",
  full: "text-danger",
};
</script>

<template>
  <span
    v-if="loading"
    class="inline-block h-hq-3 rounded-hq-pill bg-hairline animate-pulse"
    style="width: 56px;"
    data-testid="availability-chip-loading"
    aria-hidden="true"
  />
  <span
    v-else
    class="inline-flex items-center gap-hq-1 font-jp text-xs leading-none"
    :class="toneClass[display.tone]"
    data-testid="availability-chip"
  >
    <span
      class="inline-block rounded-full shrink-0"
      style="width: 6px; height: 6px;"
      :class="display.isFull ? 'bg-danger' : display.tone === 'warn' ? 'bg-warn' : 'bg-success'"
      aria-hidden="true"
    />
    <span>{{ display.text }}</span>
  </span>
</template>
