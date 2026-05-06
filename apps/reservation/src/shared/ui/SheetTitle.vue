<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  DialogTitle,
  type DialogTitleProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends DialogTitleProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
const titleClass = computed(() =>
  cn(
    "font-jp-display text-2xl font-medium text-ink leading-snug m-0",
    props.class,
  ),
);
</script>

<template>
  <DialogTitle v-bind="forwarded" :class="titleClass">
    <slot />
  </DialogTitle>
</template>
