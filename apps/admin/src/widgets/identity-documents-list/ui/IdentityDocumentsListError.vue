<script setup lang="ts">
import type { FetchErrorCode } from "@/entities/identity-document";

defineProps<{
  errorCode: FetchErrorCode | null;
}>();

defineEmits<{
  retry: [];
}>();

/**
 * /identity-documents 一覧の Error 状態。`role="alert"` 必須。
 *
 * 関連:
 *   openspec/changes/admin-identity-document-review/specs/admin-identity-document-review/spec.md
 *     (Requirement: 4 状態 / Error)
 */
</script>

<template>
  <div
    role="alert"
    class="flex flex-col items-center justify-center gap-hq-3 px-hq-8 py-hq-12 text-center"
  >
    <p class="font-jp text-base text-danger">
      書類一覧の取得に失敗しました
    </p>
    <p class="font-mono text-xs text-muted">
      ERR · supabase / identity_documents.list · {{ errorCode ?? "UNKNOWN" }}
    </p>
    <button
      type="button"
      class="inline-flex h-9 items-center justify-center rounded-hq-sm bg-accent px-hq-4 py-hq-2 text-sm font-jp font-medium text-paper shadow-hq-sm transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      @click="$emit('retry')"
    >
      再試行
    </button>
  </div>
</template>
