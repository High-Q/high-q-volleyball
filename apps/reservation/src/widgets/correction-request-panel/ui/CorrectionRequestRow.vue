<script setup lang="ts">
import {
  CORRECTION_FIELD_LABEL,
  type CorrectionField,
  type CorrectionRequest,
} from "@high-q/shared";

/**
 * #296 修正依頼パネル内の 1 行。
 *
 * field 日本語ラベル + 「修正する ›」リンク + reason テキスト。
 */
defineProps<{
  request: CorrectionRequest;
}>();

const emit = defineEmits<{
  edit: [field: CorrectionField];
}>();
</script>

<template>
  <li
    class="space-y-hq-1 border-b border-hairline last:border-b-0 pb-hq-3 last:pb-0"
    :data-field="request.field"
  >
    <div class="flex items-baseline justify-between gap-hq-3">
      <p class="font-jp text-sm font-medium text-ink m-0">
        {{ CORRECTION_FIELD_LABEL[request.field] }}
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-hq-1 font-jp text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-hq-xs px-hq-1 -mx-hq-1 whitespace-nowrap"
        @click="emit('edit', request.field)"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        <span>修正する</span>
        <span aria-hidden="true">›</span>
      </button>
    </div>
    <p class="font-jp text-xs text-ink-soft whitespace-pre-wrap m-0">
      {{ request.message }}
    </p>
  </li>
</template>
