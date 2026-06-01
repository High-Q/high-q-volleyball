<script setup lang="ts">
import { computed } from "vue";
import {
  formatAvailability,
  type AvailabilityTone,
  type EventAvailability,
} from "@/entities/event";

const props = defineProps<{
  /** `event_availability_view` の取得結果。取得失敗時 / 取得中でも prop は null で OK */
  availability: EventAvailability | null | undefined;
  /** "dark" = 黒地カード内、"light" = 通常背景。色とプログレスバー実装を切り替える */
  variant?: "dark" | "light";
  /** true の間は shimmer プレースホルダを描画する */
  loading?: boolean;
}>();

const variant = computed<"dark" | "light">(() => props.variant ?? "light");
const display = computed(() => formatAvailability(props.availability));
const isUncapped = computed(
  () => props.availability !== null && props.availability !== undefined && props.availability.capacity === null,
);
const hasBar = computed(
  () => props.availability !== null && props.availability !== undefined && props.availability.capacity !== null,
);
const pct = computed(() => {
  const a = props.availability;
  if (a === null || a === undefined || a.capacity === null) return 0;
  return Math.min(100, (a.reservedCount / a.capacity) * 100);
});

const toneClassMap: Record<"dark" | "light", Record<AvailabilityTone, string>> = {
  light: {
    ok: "text-ink",
    warn: "text-warn",
    full: "text-danger",
  },
  dark: {
    ok: "text-paper",
    warn: "text-warn-on-dark",
    full: "text-danger-on-dark",
  },
};
const dotClassMap: Record<"dark" | "light", Record<AvailabilityTone, string>> = {
  light: {
    ok: "bg-success",
    warn: "bg-warn",
    full: "bg-danger",
  },
  dark: {
    ok: "bg-success-on-dark",
    warn: "bg-warn-on-dark",
    full: "bg-danger-on-dark",
  },
};
const barTrackClass = computed(() =>
  variant.value === "dark" ? "bg-paper/15" : "bg-hairline",
);
const barFillClass = computed(
  () => dotClassMap[variant.value][display.value.tone],
);
</script>

<template>
  <div
    v-if="loading"
    class="flex items-center gap-hq-2"
    :class="variant === 'dark' ? 'text-paper/60' : 'text-muted'"
    data-testid="availability-strip-loading"
    aria-hidden="true"
  >
    <span
      class="inline-block h-hq-3 rounded-hq-pill animate-pulse"
      :class="variant === 'dark' ? 'bg-paper/15' : 'bg-hairline'"
      style="width: 72px;"
    />
  </div>
  <div
    v-else
    class="flex items-center gap-hq-3"
    :class="toneClassMap[variant][display.tone]"
    data-testid="availability-strip"
  >
    <span class="flex items-center gap-hq-2 min-w-0">
      <span
        class="inline-block rounded-full shrink-0"
        style="width: 6px; height: 6px;"
        :class="dotClassMap[variant][display.tone]"
        aria-hidden="true"
      />
      <span class="font-jp text-xs font-medium leading-none">{{ display.text }}</span>
    </span>
    <span
      v-if="hasBar"
      class="ml-auto inline-block rounded-hq-pill overflow-hidden"
      :class="barTrackClass"
      style="width: 70px; height: 4px;"
      data-testid="availability-strip-bar"
    >
      <span
        class="block h-full transition-all"
        :class="barFillClass"
        :style="{ width: `${pct}%` }"
      />
    </span>
    <span
      v-else-if="isUncapped"
      class="ml-auto font-mono text-[9px] tracking-widest uppercase"
      :class="variant === 'dark' ? 'text-paper/55' : 'text-muted'"
      data-testid="availability-strip-uncapped"
    >{{ variant === 'dark' ? 'UNCAPPED' : 'UNCAPPED · 定員上限なし' }}</span>
  </div>
</template>
