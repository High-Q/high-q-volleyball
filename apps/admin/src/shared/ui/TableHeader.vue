<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

interface Props {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const headerClass = computed(() =>
  cn("[&_tr]:border-b border-hairline", props.class),
);
</script>

<template>
  <thead :class="headerClass">
    <slot />
  </thead>
</template>
