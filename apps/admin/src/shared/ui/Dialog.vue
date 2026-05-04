<script setup lang="ts">
import {
  DialogRoot,
  type DialogRootEmits,
  type DialogRootProps,
  useForwardPropsEmits,
} from "radix-vue";

/**
 * shadcn-vue 由来の Dialog root プリミティブ。radix-vue の DialogRoot を透過 forward する。
 * focus trap / ESC 閉鎖 / 背景クリック閉鎖 / aria 属性は radix-vue が a11y 準拠で提供する。
 *
 * AlertDialog (確認系専用) と異なり、Dialog は一般用途 (画像プレビューモーダル等) に使用する。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *   openspec/changes/admin-identity-document-review/design.md (D5, D25)
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
