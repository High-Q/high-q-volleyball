<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const rowClass = computed(() =>
  cn(
    "border-b border-hairline transition-colors hover:bg-paper-warm data-[state=selected]:bg-accent-soft",
    props.class,
  ),
);
</script>

<template>
  <tr :class="rowClass">
    <slot />
  </tr>
</template>
