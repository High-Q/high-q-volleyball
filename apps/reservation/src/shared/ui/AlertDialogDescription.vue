<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  AlertDialogDescription,
  type AlertDialogDescriptionProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends AlertDialogDescriptionProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
const descClass = computed(() =>
  cn("text-sm font-jp text-muted leading-relaxed", props.class),
);
</script>

<template>
  <AlertDialogDescription v-bind="forwarded" :class="descClass">
    <slot />
  </AlertDialogDescription>
</template>
