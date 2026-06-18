<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  DialogDescription,
  type DialogDescriptionProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

/** Sheet の説明文。radix-vue が `aria-describedby` で関連付ける。 */
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
  cn("text-sm font-jp text-muted leading-relaxed", props.class),
);
</script>

<template>
  <DialogDescription v-bind="forwarded" :class="descClass">
    <slot />
  </DialogDescription>
</template>
