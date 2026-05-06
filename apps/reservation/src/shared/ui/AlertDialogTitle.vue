<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  AlertDialogTitle,
  type AlertDialogTitleProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends AlertDialogTitleProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
const titleClass = computed(() =>
  cn("text-lg font-jp font-medium text-ink", props.class),
);
</script>

<template>
  <AlertDialogTitle v-bind="forwarded" :class="titleClass">
    <slot />
  </AlertDialogTitle>
</template>
