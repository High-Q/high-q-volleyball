<script setup lang="ts">
import {
  DialogRoot,
  type DialogRootEmits,
  type DialogRootProps,
  useForwardPropsEmits,
} from "radix-vue";

/**
 * shadcn-vue 由来の Sheet (ドロワー) root プリミティブ。radix-vue の DialogRoot を
 * 透過 forward する。focus trap / ESC 閉鎖 / 背景クリック閉鎖 / スクロールロック /
 * aria 属性は radix-vue が a11y 準拠で提供する。
 *
 * Dialog (中央モーダル) と異なり、Sheet は端から slide-in するパネル
 * (admin-shell のモバイルナビ用ドロワー等) に使用する。
 *
 * 関連:
 *   openspec/changes/admin-mobile-responsive/specs/admin-responsive-shell/spec.md
 *   openspec/changes/admin-mobile-responsive/design.md (D5)
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
