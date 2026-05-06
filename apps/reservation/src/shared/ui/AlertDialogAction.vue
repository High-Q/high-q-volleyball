<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  AlertDialogAction,
  type AlertDialogActionProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends AlertDialogActionProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
const actionClass = computed(() =>
  cn(
    "inline-flex h-9 items-center justify-center rounded-hq-sm bg-danger px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
    props.class,
  ),
);
</script>

<template>
  <AlertDialogAction v-bind="forwarded" :class="actionClass">
    <slot />
  </AlertDialogAction>
</template>
