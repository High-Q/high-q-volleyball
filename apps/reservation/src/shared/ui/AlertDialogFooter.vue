<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const footerClass = computed(() =>
  cn(
    "flex flex-col-reverse gap-hq-2 sm:flex-row sm:justify-end sm:gap-hq-2",
    props.class,
  ),
);
</script>

<template>
  <div :class="footerClass">
    <slot />
  </div>
</template>
