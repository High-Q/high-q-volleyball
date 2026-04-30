<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  SelectItem,
  SelectItemIndicator,
  type SelectItemProps,
  SelectItemText,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends SelectItemProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});

const forwarded = useForwardProps(delegated);

const itemClass = computed(() =>
  cn(
    "relative flex w-full cursor-default select-none items-center rounded-hq-sm py-hq-2 pl-hq-6 pr-hq-2 text-sm font-jp outline-none focus:bg-paper-warm focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
    props.class,
  ),
);
</script>

<template>
  <SelectItem v-bind="forwarded" :class="itemClass">
    <span class="absolute left-hq-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectItemIndicator>
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
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </SelectItemIndicator>
    </span>
    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
