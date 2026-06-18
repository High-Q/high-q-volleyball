<script setup lang="ts">
import { DialogClose, type DialogCloseProps } from "radix-vue";

/** Sheet (ドロワー) を閉じるトリガー。radix-vue の DialogClose を透過する。 */
const props = defineProps<DialogCloseProps>();
</script>

<template>
  <DialogClose v-bind="props">
    <slot />
  </DialogClose>
</template>
