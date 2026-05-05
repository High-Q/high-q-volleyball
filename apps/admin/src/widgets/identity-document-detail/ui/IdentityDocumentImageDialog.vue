<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";

/**
 * 画像プレビュー Dialog (拡大 + ズーム切替)。
 *
 * ズーム: 1x / 2x / 4x。CSS transform: scale() のみで実装。
 * 4x で画面に収まらない場合は overflow-auto で縦横スクロール (MVP1 範囲)。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 画像プレビュー Dialog 拡大モーダル)
 */

const props = defineProps<{
  /** Dialog 開閉状態 (v-model:open 経由) */
  open: boolean;
  /** 画像の signed URL */
  signedUrl: string;
  /** alt テキスト (例: "運転免許証 の表面") */
  alt: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const zoom = ref<1 | 2 | 4>(1);

const transformStyle = computed(() => `transform: scale(${zoom.value})`);

function setZoom(value: 1 | 2 | 4): void {
  zoom.value = value;
}
</script>

<template>
  <Dialog
    :open="props.open"
    @update:open="(v) => emit('update:open', v)"
  >
    <DialogContent class="max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ props.alt }}</DialogTitle>
      </DialogHeader>

      <div class="flex items-center gap-hq-2 border-b border-hairline pb-hq-2">
        <span class="font-mono text-xs uppercase tracking-widest text-muted">
          ズーム
        </span>
        <button
          v-for="value in [1, 2, 4] as const"
          :key="value"
          type="button"
          :aria-pressed="zoom === value"
          :aria-label="`${value} 倍に拡大`"
          :class="
            zoom === value
              ? 'inline-flex h-7 items-center justify-center rounded-hq-sm bg-accent px-hq-3 text-xs font-jp font-medium text-paper'
              : 'inline-flex h-7 items-center justify-center rounded-hq-sm border border-hairline bg-paper px-hq-3 text-xs font-jp font-medium text-ink hover:bg-paper-warm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent'
          "
          @click="setZoom(value)"
        >
          {{ value }}x
        </button>
      </div>

      <div class="overflow-auto max-h-screen-50">
        <div class="origin-top-left" :style="transformStyle">
          <img
            :src="props.signedUrl"
            :alt="props.alt"
            class="h-auto w-full select-none"
            decoding="async"
          />
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.max-h-screen-50 {
  max-height: 70vh;
}
</style>
