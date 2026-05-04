<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const headerClass = computed(() =>
  cn("flex flex-col gap-hq-2 text-center sm:text-left", props.class),
);
</script>

<template>
  <div :class="headerClass">
    <slot />
  </div>
</template>
