<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  ToastDescription,
  type ToastDescriptionProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends ToastDescriptionProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
const descClass = computed(() =>
  cn("text-sm font-jp text-muted opacity-90", props.class),
);
</script>

<template>
  <ToastDescription v-bind="forwarded" :class="descClass">
    <slot />
  </ToastDescription>
</template>
