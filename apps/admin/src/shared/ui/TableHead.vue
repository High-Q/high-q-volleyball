<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const headClass = computed(() =>
  cn(
    "h-10 px-hq-3 text-left align-middle font-mono text-xs font-medium uppercase tracking-widest text-muted [&:has([role=checkbox])]:pr-0",
    props.class,
  ),
);
</script>

<template>
  <th :class="headClass">
    <slot />
  </th>
</template>
