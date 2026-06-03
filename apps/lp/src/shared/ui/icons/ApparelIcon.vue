<script setup lang="ts">
defineProps({
  size: { type: Number, default: 22 },
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
    <path d="M7.5 4.5 4 8l2.5 2.5L8 9v10h8V9l1.5 1.5L20 8l-3.5-3.5H14a2 2 0 0 1-4 0z" />
  </svg>
</template>
