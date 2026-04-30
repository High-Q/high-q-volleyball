<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

/**
 * shadcn-vue 由来の Skeleton プリミティブ。Loading 状態のプレースホルダ。
 * HQ デザイントークン経由で着色する。
 *
 * 関連:
 *   openspec/changes/admin-events-list-screen/specs/shadcn-vue-integration/spec.md
 */

interface Props {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const skeletonClass = computed(() =>
  cn(
    "hq-skeleton animate-pulse rounded-hq-sm bg-hairline",
    props.class,
  ),
);
</script>

<template>
  <div :class="skeletonClass" aria-hidden="true" />
</template>
