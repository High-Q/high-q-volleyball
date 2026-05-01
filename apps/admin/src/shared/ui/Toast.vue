<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  ToastRoot,
  type ToastRootEmits,
  type ToastRootProps,
  useForwardPropsEmits,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

/**
 * shadcn-vue 由来の Toast root。アニメーションは scoped <style> で自前実装し、
 * `tailwindcss-animate` プラグインに依存しない（プロジェクト未導入のため、
 * shadcn 標準の `data-[state=*]:animate-in` 等は CSS が解決されず Toast が
 * 画面外で停止する不具合が観測された）。
 *
 * 関連:
 *   openspec/changes/admin-events-crud-screen/specs/admin-events-crud/spec.md
 *   openspec/changes/admin-events-crud-screen/design.md (D7)
 */

type Variant = "default" | "destructive";

interface Props extends ToastRootProps {
  class?: HTMLAttributes["class"];
  variant?: Variant;
}

const props = withDefaults(defineProps<Props>(), { variant: "default" });
const emits = defineEmits<ToastRootEmits>();

const delegated = computed(() => {
  const { class: _class, variant: _v, ...rest } = props;
  return rest;
});
const forwarded = useForwardPropsEmits(delegated, emits);

const toastClass = computed(() =>
  cn(
    "hq-toast",
    "group pointer-events-auto relative flex w-full items-center justify-between gap-hq-3 overflow-hidden rounded-hq-md border p-hq-4 pr-hq-6 shadow-hq-md",
    props.variant === "destructive"
      ? "border-danger/50 bg-danger-soft text-danger"
      : "border-hairline bg-paper text-ink",
    props.class,
  ),
);
</script>

<template>
  <ToastRoot v-bind="forwarded" :class="toastClass">
    <slot />
  </ToastRoot>
</template>

<!--
  注意: scoped を**外す** (global CSS)。理由:
  radix-vue の <ToastRoot> が render する <li> 要素に Vue の `data-v-xxx`
  属性が確実には付かず、scoped style の `.hq-toast[data-state="open"]` セレ
  クタが当たらないケースが観測された (実機で Toast 不可視)。`hq-toast`
  クラスは独自命名のため global にしても他要素と衝突しない。
-->
<style>
@keyframes hq-toast-slide-in-bottom {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes hq-toast-slide-out-right {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* 初期状態は visible（アニメーションが効かない環境でも見える保険） */
.hq-toast {
  opacity: 1;
  transform: translateY(0);
  will-change: transform, opacity;
}

.hq-toast[data-state="open"] {
  animation: hq-toast-slide-in-bottom 220ms ease-out;
}

.hq-toast[data-state="closed"] {
  animation: hq-toast-slide-out-right 180ms ease-in forwards;
}

@media (prefers-reduced-motion: reduce) {
  .hq-toast[data-state="open"],
  .hq-toast[data-state="closed"] {
    animation: none;
  }
}
</style>
