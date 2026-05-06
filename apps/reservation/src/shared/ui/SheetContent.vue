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
 * Bottom Sheet 用の Content プリミティブ。
 *
 * - 画面下部から立ち上がり、最大高さは画面の 90% (内部スクロール許容)
 * - モバイル幅では全幅、640px 以上では中央寄せ・最大幅 32rem (sm:max-w-lg)
 * - 上端を hairline で finish、下端は paper でフラット
 * - data-state アニメーション: open=slide-in-from-bottom / close=slide-out-to-bottom
 *
 * 関連:
 *   openspec/changes/reservation-booking-flow/specs/reservation-booking-flow/spec.md
 *   openspec/changes/reservation-booking-flow/design.md (D11)
 */

interface Props extends DialogContentProps {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
const emits = defineEmits<DialogContentEmits>();

const delegated = computed(() => {
  const { class: _class, ...rest } = props;
  return rest;
});

const forwarded = useForwardPropsEmits(delegated, emits);

const contentClass = computed(() =>
  cn(
    "fixed inset-x-0 bottom-0 z-50 flex flex-col gap-hq-4 border-t border-hairline bg-paper rounded-t-hq-lg shadow-hq-md",
    "max-h-[90vh] overflow-y-auto",
    "p-hq-5 pb-hq-6",
    "duration-300",
    "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
    "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
    "sm:left-1/2 sm:right-auto sm:bottom-0 sm:-translate-x-1/2 sm:w-full sm:max-w-lg",
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
