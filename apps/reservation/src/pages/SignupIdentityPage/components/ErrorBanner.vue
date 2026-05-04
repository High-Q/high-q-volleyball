<script setup lang="ts">
interface Props {
  title: string;
  description?: string;
}

defineProps<Props>();
</script>

<template>
  <div
    role="alert"
    aria-live="polite"
    class="mt-hq-4 flex gap-hq-3 rounded-lg border border-danger bg-danger/[0.08] px-hq-3 py-hq-3"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      class="mt-[2px] flex-shrink-0 text-danger"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
    <div>
      <div class="font-jp text-[12.5px] font-medium text-danger">
        {{ title }}
      </div>
      <p
        v-if="description"
        class="mt-[2px] font-jp text-[11.5px] leading-[1.6] text-ink/80"
      >
        {{ description }}
      </p>
    </div>
  </div>
</template>
