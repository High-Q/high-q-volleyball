<script setup lang="ts">
import { computed } from "vue";

/**
 * 同伴者数の inline stepper。0〜5 の範囲で −/+ ボタン操作。
 *
 * - 0 で − ボタン disabled、5 で + ボタン disabled (DB CHECK 制約準拠)
 * - in-flight 中は両ボタン disabled + aria-busy
 *
 * 関連:
 *   openspec/changes/admin-event-detail-screen/specs/admin-event-detail/spec.md
 */

const MIN = 0;
const MAX = 5;

interface Props {
  count: number;
  memberName: string;
  inFlight?: boolean;
}

const props = withDefaults(defineProps<Props>(), { inFlight: false });

const emit = defineEmits<{
  (e: "change", nextCount: number): void;
}>();

const canDec = computed(() => !props.inFlight && props.count > MIN);
const canInc = computed(() => !props.inFlight && props.count < MAX);

function dec(): void {
  if (!canDec.value) return;
  emit("change", props.count - 1);
}

function inc(): void {
  if (!canInc.value) return;
  emit("change", props.count + 1);
}
</script>

<template>
  <div
    class="hq-guest-stepper"
    :aria-busy="inFlight"
    :aria-label="`${memberName} の同伴者数 ${count} 名`"
  >
    <button
      type="button"
      class="hq-guest-stepper__btn"
      :disabled="!canDec"
      :aria-label="`${memberName} の同伴者を 1 減らす`"
      @click="dec"
    >
      −
    </button>
    <span
      class="hq-guest-stepper__value"
      :class="count > 0 ? 'text-ink' : 'text-muted'"
      data-testid="guest-count-value"
    >{{ count > 0 ? `+${count}` : "–" }}</span>
    <button
      type="button"
      class="hq-guest-stepper__btn"
      :disabled="!canInc"
      :aria-label="`${memberName} の同伴者を 1 増やす`"
      @click="inc"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.hq-guest-stepper {
  display: inline-flex;
  align-items: center;
  gap: var(--hq-space-1);
}

.hq-guest-stepper__btn {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--hq-color-hairline);
  border-radius: var(--hq-radius-sm);
  color: var(--hq-color-muted);
  font-family: var(--hq-font-mono);
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.hq-guest-stepper__btn:hover:not(:disabled) {
  background: var(--hq-color-paper-warm);
  color: var(--hq-color-ink);
  border-color: var(--hq-color-ink-soft);
}

.hq-guest-stepper__btn:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 1px;
}

.hq-guest-stepper__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.hq-guest-stepper__value {
  font-family: var(--hq-font-mono);
  font-size: 12px;
  min-width: 22px;
  text-align: center;
}

.hq-guest-stepper[aria-busy="true"] {
  opacity: 0.5;
  pointer-events: none;
}
</style>
