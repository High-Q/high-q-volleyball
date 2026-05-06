<script setup lang="ts">
import {
  DialogRoot,
  type DialogRootEmits,
  type DialogRootProps,
  useForwardPropsEmits,
} from "radix-vue";

/**
 * shadcn-vue 由来の Sheet root プリミティブ (Bottom Sheet 用)。
 * radix-vue の DialogRoot を透過 forward する。focus trap / ESC 閉鎖 /
 * 背景クリック閉鎖 / aria 属性は radix-vue が a11y 準拠で提供する。
 *
 * 中央モーダル用の Dialog (admin 側 / 画像プレビュー等) と区別するため、
 * 画面下部から立ち上がるシート用途では本コンポーネントを SHALL 使用する。
 *
 * 関連:
 *   openspec/changes/reservation-booking-flow/specs/reservation-booking-flow/spec.md
 *   openspec/changes/reservation-booking-flow/design.md (D11)
 */

const props = defineProps<DialogRootProps>();
const emits = defineEmits<DialogRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <DialogRoot v-bind="forwarded">
    <slot />
  </DialogRoot>
</template>
