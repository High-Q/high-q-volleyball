<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const captionClass = computed(() =>
  cn("mt-hq-4 text-sm text-muted font-jp", props.class),
);
</script>

<template>
  <caption :class="captionClass">
    <slot />
  </caption>
</template>
