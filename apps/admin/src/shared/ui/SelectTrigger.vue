<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  SelectIcon,
  SelectTrigger,
  type SelectTriggerProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends SelectTriggerProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});

const forwarded = useForwardProps(delegated);

const triggerClass = computed(() =>
  cn(
    "flex h-9 w-full items-center justify-between rounded-hq-sm border border-hairline bg-paper px-hq-3 py-hq-2 text-sm font-jp text-ink shadow-hq-sm placeholder:text-muted focus:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
    props.class,
  ),
);
</script>

<template>
  <SelectTrigger v-bind="forwarded" :class="triggerClass">
    <slot />
    <SelectIcon as-child>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="ml-hq-2 h-4 w-4 opacity-50"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </SelectIcon>
  </SelectTrigger>
</template>
