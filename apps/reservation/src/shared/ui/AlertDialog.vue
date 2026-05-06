<script setup lang="ts">
import {
  AlertDialogRoot,
  type AlertDialogEmits,
  type AlertDialogProps,
  useForwardPropsEmits,
} from "radix-vue";

/**
 * shadcn-vue 由来の AlertDialog root プリミティブ。radix-vue の
 * AlertDialogRoot を透過 forward する。focus trap / ESC 閉鎖 / aria 属性は
 * radix-vue が a11y 準拠で提供する。
 *
 * 関連:
 *   openspec/changes/reservation-booking-flow/specs/reservation-booking-flow/spec.md
 *   openspec/changes/reservation-booking-flow/design.md (D5)
 */

const props = defineProps<AlertDialogProps>();
const emits = defineEmits<AlertDialogEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <AlertDialogRoot v-bind="forwarded">
    <slot />
  </AlertDialogRoot>
</template>
