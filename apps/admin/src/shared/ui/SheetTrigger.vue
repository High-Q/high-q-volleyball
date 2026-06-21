<script setup lang="ts">
import { DialogTrigger, type DialogTriggerProps } from "radix-vue";

/**
 * Sheet (ドロワー) を開くトリガー。radix-vue の DialogTrigger を透過する。
 * `aria-expanded` / `aria-controls` は radix-vue が自動付与する。
 */
const props = defineProps<DialogTriggerProps>();
</script>

<template>
  <DialogTrigger v-bind="props">
    <slot />
  </DialogTrigger>
</template>
