<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  SelectContent,
  type SelectContentEmits,
  type SelectContentProps,
  SelectPortal,
  SelectViewport,
  useForwardPropsEmits,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends SelectContentProps {
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), {
  position: "popper",
});
const emits = defineEmits<SelectContentEmits>();

const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});

const forwarded = useForwardPropsEmits(delegated, emits);

const contentClass = computed(() =>
  cn(
    "relative z-50 min-w-[8rem] overflow-hidden rounded-hq-md border border-hairline bg-paper text-ink shadow-hq-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
    props.class,
  ),
);

const viewportClass = computed(() =>
  cn(
    "p-hq-1",
    props.position === "popper" &&
      "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
  ),
);
</script>

<template>
  <SelectPortal>
    <SelectContent v-bind="forwarded" :class="contentClass">
      <SelectViewport :class="viewportClass">
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
