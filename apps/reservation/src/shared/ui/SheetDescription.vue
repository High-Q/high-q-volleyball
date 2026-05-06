<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  DialogDescription,
  type DialogDescriptionProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends DialogDescriptionProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);
const descClass = computed(() =>
  cn("font-jp text-xs text-muted leading-relaxed m-0", props.class),
);
</script>

<template>
  <DialogDescription v-bind="forwarded" :class="descClass">
    <slot />
  </DialogDescription>
</template>
