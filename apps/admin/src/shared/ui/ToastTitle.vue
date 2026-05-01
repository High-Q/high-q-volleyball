<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { ToastTitle, type ToastTitleProps, useForwardProps } from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends ToastTitleProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
const titleClass = computed(() =>
  cn("text-sm font-jp font-medium", props.class),
);
</script>

<template>
  <ToastTitle v-bind="forwarded" :class="titleClass">
    <slot />
  </ToastTitle>
</template>
