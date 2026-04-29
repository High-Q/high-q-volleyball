<script setup lang="ts">
import { type HTMLAttributes } from "vue";
import { cn } from "@/shared/lib/utils";

/**
 * shadcn-vue 由来の Label プリミティブ。HQ デザイントークン経由で着色する。
 * `for` 属性は `htmlFor` prop で受ける（Vue の予約名衝突回避）。
 */

interface Props {
  htmlFor?: string | undefined;
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
</script>

<template>
  <label
    :for="htmlFor"
    :class="
      cn(
        'font-jp text-sm font-medium text-ink-soft leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class,
      )
    "
  >
    <slot />
  </label>
</template>
