<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { cn } from "@/shared/lib/utils";

/**
 * 「デスクトップ Table / モバイル カード」併置のモバイル側カード枠。
 * `md:hidden` で < md (768px) のみ表示し、デスクトップでは隠れる (Table 側を表示)。
 * リストの a11y セマンティクス (`role="list"`) と縦積みの余白を提供する。
 * カード本体 (`<li>`) は各 widget がスロットで供給する。
 *
 * 関連:
 *   openspec/changes/admin-mobile-responsive/specs/admin-responsive-shell/spec.md
 *   openspec/changes/admin-mobile-responsive/design.md (D3)
 */
interface Props {
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();

const listClass = computed(() =>
  cn("flex flex-col gap-hq-3 md:hidden", props.class),
);
</script>

<template>
  <ul role="list" :class="listClass">
    <slot />
  </ul>
</template>
