<script setup lang="ts">
import { computed } from "vue";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    variant: "primary",
    size: "md",
    disabled: false,
    loading: false,
    type: "button",
  },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const isInactive = computed(() => props.disabled || props.loading);

const classes = computed(() => [
  "hq-btn",
  `hq-btn--${props.variant}`,
  `hq-btn--${props.size}`,
  { "hq-btn--inactive": isInactive.value },
]);

function handleClick(event: MouseEvent) {
  if (isInactive.value) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  emit("click", event);
}
</script>

<template>
  <button
    :class="classes"
    :type="type"
    :disabled="disabled"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    @click="handleClick"
  >
    <span v-if="loading" class="hq-btn__spinner" aria-hidden="true" />
    <span class="hq-btn__label"><slot /></span>
  </button>
</template>

<style scoped>
.hq-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--hq-space-2);
  border-radius: var(--hq-radius-pill);
  font-family: var(--hq-font-jp);
  font-weight: 500;
  letter-spacing: 0.05em;
  border: 1px solid transparent;
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
  box-sizing: border-box;
}

.hq-btn:focus-visible {
  outline: 2px solid var(--hq-color-accent);
  outline-offset: 2px;
}

.hq-btn--md {
  padding: 14px 22px;
  font-size: 14px;
  min-height: 48px;
}

.hq-btn--sm {
  padding: 8px 16px;
  font-size: 13px;
  min-height: 36px;
}

.hq-btn--primary {
  background: var(--hq-color-ink);
  color: var(--hq-color-paper);
  border-color: var(--hq-color-ink);
}

.hq-btn--secondary {
  background: transparent;
  color: var(--hq-color-ink);
  border-color: var(--hq-color-hairline);
}

.hq-btn--ghost {
  background: transparent;
  color: var(--hq-color-ink);
  border-color: transparent;
}

.hq-btn--danger {
  background: var(--hq-color-accent);
  color: var(--hq-color-paper);
  border-color: var(--hq-color-accent);
}

.hq-btn:not(.hq-btn--inactive):hover {
  opacity: 0.88;
}

.hq-btn--inactive {
  cursor: not-allowed;
  opacity: 0.5;
}

.hq-btn__spinner {
  width: 14px;
  height: 14px;
  border-radius: var(--hq-radius-pill);
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: hq-btn-spin 720ms linear infinite;
}

@keyframes hq-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
