<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogOverlay,
  DialogPortal,
  DialogClose,
  useForwardPropsEmits,
} from "radix-vue";
import { cn } from "@/shared/lib/utils";

/**
 * Sheet (ドロワー) の本体パネル。端から slide-in する。radix-vue の DialogContent を
 * 土台にし、focus trap / ESC / 背景クリック / スクロールロック / aria-modal を継承する。
 *
 * `side` で出現方向を切り替える (デフォルト left = admin-shell モバイルナビ用)。
 */
interface Props extends DialogContentProps {
  class?: HTMLAttributes["class"];
  side?: "left" | "right";
}

const props = withDefaults(defineProps<Props>(), { side: "left" });
const emits = defineEmits<DialogContentEmits>();

const delegated = computed(() => {
  const { class: _class, side: _side, ...rest } = props;
  return rest;
});

const forwarded = useForwardPropsEmits(delegated, emits);

const contentClass = computed(() =>
  cn(
    "fixed inset-y-0 z-50 flex h-full w-[18rem] max-w-[85vw] flex-col border-hairline bg-paper shadow-hq-md duration-200",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    props.side === "left"
      ? "left-0 border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left"
      : "right-0 border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
    props.class,
  ),
);
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <DialogContent v-bind="forwarded" :class="contentClass">
      <slot />
      <DialogClose
        class="absolute right-hq-4 top-hq-4 rounded-hq-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none"
        aria-label="閉じる"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
