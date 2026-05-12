<script setup>
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
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 7.5 3.5 4.5 3.5-4.5" />
    <path d="M12 12v5.5" />
    <path d="M9 13.5h6" />
    <path d="M9 15.5h6" />
  </svg>
</template>
