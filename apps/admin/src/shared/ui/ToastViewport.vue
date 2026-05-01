<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  ToastViewport,
  type ToastViewportProps,
  useForwardProps,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

interface Props extends ToastViewportProps {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});
const forwarded = useForwardProps(delegated);

/**
 * Toast 配置 (mobile / desktop 共通で **画面下部**):
 * - mobile (< sm): `bottom-0 left-0 right-0` で画面下部全幅
 * - sm 以上: `sm:left-auto sm:right-0` で右下、最大幅 420px
 *
 * 設計判断:
 * - mobile で `top-0` 配置だと sticky ヘッダーに被って操作不能 → 下に統一
 * - safe-area-inset-bottom は Tailwind 任意値 `pb-[max(env(safe-area-inset-bottom),1rem)]`
 *   で対応。iOS の home indicator や URL bar 直上に Toast が隠れないよう、
 *   下方向の padding は最低 16px、safe-area-inset-bottom が大きい端末では
 *   それを優先
 * - `right-0` だけ指定だと `left: auto` のまま width が壊れる端末があるので
 *   mobile は `left-0 right-0` を明示する
 */
const vpClass = computed(() =>
  cn(
    "hq-toast-viewport",
    "fixed bottom-0 left-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-hq-2 p-hq-4",
    "pb-[max(env(safe-area-inset-bottom),1rem)]",
    "sm:left-auto sm:right-0 md:max-w-[420px]",
    props.class,
  ),
);
</script>

<template>
  <ToastViewport
    v-bind="forwarded"
    :class="vpClass"
    role="region"
    aria-label="通知"
  />
</template>
