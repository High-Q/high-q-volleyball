<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

/**
 * shadcn-vue 由来の Table プリミティブ。HQ デザイントークン経由で着色する。
 *
 * 関連:
 *   openspec/changes/admin-events-list-screen/specs/shadcn-vue-integration/spec.md
 *   apps/admin/tailwind.config.ts （HQ preset 適用）
 */

interface Props {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const wrapperClass = computed(() =>
  cn("hq-table-wrapper relative w-full overflow-auto", props.class),
);
</script>

<template>
  <div :class="wrapperClass">
    <table class="w-full caption-bottom text-sm font-jp text-ink">
      <slot />
    </table>
  </div>
</template>
