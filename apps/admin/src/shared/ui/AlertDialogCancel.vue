<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  AlertDialogCancel,
  type AlertDialogCancelProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends AlertDialogCancelProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
const cancelClass = computed(() =>
  cn(
    "inline-flex h-9 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-4 py-hq-2 text-sm font-jp font-medium text-ink shadow-hq-sm transition-colors hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 mt-hq-2 sm:mt-0",
    props.class,
  ),
);
</script>

<template>
  <AlertDialogCancel v-bind="forwarded" :class="cancelClass">
    <slot />
  </AlertDialogCancel>
</template>
