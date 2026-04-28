<script setup lang="ts">
type ColorKey = "accent" | "ink" | "muted";

withDefaults(
  defineProps<{
    color?: ColorKey;
  }>(),
  {
    color: "accent",
  },
);
</script>

<template>
  <div :class="['hq-kicker', `hq-kicker--${color}`]">
    <slot />
  </div>
</template>

<style scoped>
.hq-kicker {
  font-family: var(--hq-font-mono);
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-weight: 500;
}

.hq-kicker--accent {
  color: var(--hq-color-accent);
}

.hq-kicker--ink {
  color: var(--hq-color-ink);
}

.hq-kicker--muted {
  color: var(--hq-color-muted);
}
</style>
