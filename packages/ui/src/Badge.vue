<script setup lang="ts">
type Tone = "neutral" | "accent" | "success" | "warn" | "danger" | "draft";

withDefaults(
  defineProps<{
    tone?: Tone;
  }>(),
  {
    tone: "neutral",
  },
);
</script>

<template>
  <span :class="['hq-badge', `hq-badge--${tone}`]">
    <slot />
  </span>
</template>

<style scoped>
.hq-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--hq-radius-pill);
  font-family: var(--hq-font-jp);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  border: 1px solid var(--hq-color-hairline);
  line-height: 1.4;
}

.hq-badge--neutral {
  background: var(--hq-color-paper-warm);
  color: var(--hq-color-ink);
}

.hq-badge--accent {
  background: var(--hq-color-accent-soft);
  color: var(--hq-color-accent);
  border-color: var(--hq-color-accent);
}

.hq-badge--success {
  background: var(--hq-color-success-soft);
  color: var(--hq-color-success);
  border-color: var(--hq-color-success);
}

.hq-badge--warn {
  background: var(--hq-color-warn-soft);
  color: var(--hq-color-warn);
  border-color: var(--hq-color-warn);
}

.hq-badge--danger {
  background: var(--hq-color-danger-soft);
  color: var(--hq-color-danger);
  border-color: var(--hq-color-danger);
}

.hq-badge--draft {
  background: transparent;
  color: var(--hq-color-muted);
  border-style: dashed;
}
</style>
