<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  capacity: number;
  taken: number;
  /** warning モードへ切り替える残席率の閾値 (0-1)。デフォルト 0.2 (= 残 20% 以下) */
  warningThreshold?: number;
}>();

const threshold = computed(() => props.warningThreshold ?? 0.2);

const remain = computed(() => Math.max(props.capacity - props.taken, 0));
const isFull = computed(() => props.taken >= props.capacity);
const ratio = computed(() => {
  if (props.capacity <= 0) return 0;
  return Math.min(props.taken / props.capacity, 1);
});
const remainRatio = computed(() => 1 - ratio.value);

const mode = computed<"normal" | "warning" | "full">(() => {
  if (isFull.value) return "full";
  if (remainRatio.value <= threshold.value) return "warning";
  return "normal";
});

const fillStyle = computed(() => ({ width: `${ratio.value * 100}%` }));
const labelText = computed(() =>
  isFull.value ? "満席" : `残 ${remain.value} / ${props.capacity}`,
);
</script>

<template>
  <div
    :class="['hq-remain', `hq-remain--${mode}`]"
    role="progressbar"
    :aria-valuenow="taken"
    :aria-valuemin="0"
    :aria-valuemax="capacity"
    :aria-label="labelText"
  >
    <div class="hq-remain__track">
      <div class="hq-remain__fill" :style="fillStyle" />
    </div>
    <div class="hq-remain__label">{{ labelText }}</div>
  </div>
</template>

<style scoped>
.hq-remain {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-family: var(--hq-font-jp);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.hq-remain__track {
  width: 100%;
  height: 4px;
  background: var(--hq-color-hairline);
  border-radius: var(--hq-radius-pill);
  overflow: hidden;
}

.hq-remain__fill {
  height: 100%;
  border-radius: var(--hq-radius-pill);
  transition: width 200ms ease;
}

.hq-remain--normal .hq-remain__fill {
  background: var(--hq-color-ink);
}

.hq-remain--normal .hq-remain__label {
  color: var(--hq-color-ink);
}

.hq-remain--warning .hq-remain__fill {
  background: var(--hq-color-accent);
}

.hq-remain--warning .hq-remain__label {
  color: var(--hq-color-accent);
  font-weight: 500;
}

.hq-remain--full .hq-remain__fill {
  background: var(--hq-color-muted);
}

.hq-remain--full .hq-remain__label {
  color: var(--hq-color-muted);
}
</style>
