<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  AlertDialogContent,
  type AlertDialogContentEmits,
  type AlertDialogContentProps,
  AlertDialogOverlay,
  AlertDialogPortal,
  useForwardPropsEmits,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends AlertDialogContentProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
const emits = defineEmits<AlertDialogContentEmits>();

const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});

const forwarded = useForwardPropsEmits(delegated, emits);

const contentClass = computed(() =>
  cn(
    "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-hq-4 border border-hairline bg-paper p-hq-6 shadow-hq-md duration-200 sm:rounded-hq-md",
    // 縦長コンテンツでもビューポート内に収まるよう max-h + overflow-y-auto を当てる。
    // (#272 メール本文プレビュー追加でモバイル + 長文メッセージ時に Dialog が
    //  画面外に固定される事象を解消)
    "max-h-[90vh] overflow-y-auto overscroll-contain",
    "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
    props.class,
  ),
);
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      class="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <AlertDialogContent v-bind="forwarded" :class="contentClass">
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
