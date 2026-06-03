<script setup lang="ts">
defineProps({
  size: { type: Number, default: 28 },
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M5 8.5h14l-1 12H6z" />
    <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
  </svg>
</template>
