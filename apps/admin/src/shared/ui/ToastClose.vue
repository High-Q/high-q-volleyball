<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { ToastClose, type ToastCloseProps, useForwardProps } from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends ToastCloseProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
const btnClass = computed(() =>
  cn(
    "absolute right-hq-2 top-hq-2 rounded-hq-sm p-hq-1 text-muted opacity-0 transition-opacity hover:text-ink focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-accent group-hover:opacity-100",
    props.class,
  ),
);
</script>

<template>
  <ToastClose v-bind="forwarded" :class="btnClass" aria-label="閉じる">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="h-4 w-4"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </ToastClose>
</template>
